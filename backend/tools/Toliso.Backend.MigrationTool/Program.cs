using System.Text.RegularExpressions;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Runtime;
using Amazon.Runtime.CredentialManagement;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.MigrationTool;

const string AwsProfile = "aws-personal";
var awsRegion = RegionEndpoint.SAEast1;

Console.WriteLine("=== Migração DynamoDB -> Supabase (somente leitura no Dynamo) ===");

// --- Postgres: mesma connection string da API, nunca duplicada em texto ---
var apiProjectPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "Toliso.Backend.Api"));
var configuration = new ConfigurationBuilder()
    .SetBasePath(apiProjectPath)
    .AddJsonFile("appsettings.json")
    .AddJsonFile("appsettings.Development.json", optional: true)
    .Build();

var connectionString = configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("COLE_SUA_SENHA_AQUI"))
{
    Console.WriteLine("ERRO: ConnectionStrings:Default não configurada (ou ainda com o placeholder de senha) em appsettings.json.");
    return 1;
}

var dbOptions = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options;
await using var db = new AppDbContext(dbOptions);

if (await db.Users.AnyAsync())
{
    Console.WriteLine("ERRO: já existem usuários no Postgres. Esta ferramenta é pra rodar uma única vez, contra um banco vazio — abortando pra não duplicar dados.");
    return 1;
}

// --- DynamoDB: somente leitura (ScanAsync). Este arquivo nunca deve ganhar uma chamada de Delete/Put/Update. ---
var credentialsChain = new CredentialProfileStoreChain();
if (!credentialsChain.TryGetAWSCredentials(AwsProfile, out AWSCredentials? credentials))
{
    Console.WriteLine($"ERRO: perfil AWS '{AwsProfile}' não encontrado em ~/.aws/credentials.");
    return 1;
}

using var dynamo = new AmazonDynamoDBClient(credentials, awsRegion);

Console.WriteLine("Lendo tabelas do DynamoDB...");
var usersRaw = await DynamoHelpers.ScanAllAsync(dynamo, "usersTL");
var cardsRaw = await DynamoHelpers.ScanAllAsync(dynamo, "cardsTL");
var transactionsRaw = await DynamoHelpers.ScanAllAsync(dynamo, "transactionsTL");
var entriesRaw = await DynamoHelpers.ScanAllAsync(dynamo, "entriesTL");
var pushTokensRaw = await DynamoHelpers.ScanAllAsync(dynamo, "pushTokensTL");

Console.WriteLine($"  users={usersRaw.Count} cards={cardsRaw.Count} transactions={transactionsRaw.Count} entries={entriesRaw.Count} pushTokens={pushTokensRaw.Count}");

var warnings = new List<string>();

// --- Usuários ---
var userIdMap = new Dictionary<string, Guid>();

foreach (var item in usersRaw)
{
    var newId = Guid.CreateVersion7();
    userIdMap[item.S("id")] = newId;

    db.Users.Add(new User
    {
        Id = newId,
        Email = item.S("email"),
        Name = item.S("name"),
        // A senha ja existe em texto puro no Dynamo — migrar e so envolve-la
        // num hash de verdade; o usuario continua logando com a MESMA senha.
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(item.S("password")),
        Role = item.S("role") == "admin" ? UserRole.Admin : UserRole.User,
        Status = item.S("status") == "active" ? EntityStatus.Active : EntityStatus.Inactive,
        CreatedAt = item.DateTimeOffset("createdAt"),
        UpdatedAt = item.DateTimeOffset("updatedAt"),
    });
}

// --- Cartões ---
var cardIdMap = new Dictionary<string, Guid>();
var cardBrandMap = new Dictionary<string, CardBrand>
{
    ["visa"] = CardBrand.Visa,
    ["mastercard"] = CardBrand.Mastercard,
    ["elo"] = CardBrand.Elo,
    ["american-express"] = CardBrand.AmericanExpress,
};

foreach (var item in cardsRaw)
{
    var newId = Guid.CreateVersion7();
    cardIdMap[item.S("id")] = newId;

    db.CreditCards.Add(new CreditCard
    {
        Id = newId,
        Name = item.S("name"),
        Bank = item.S("bank"),
        Brand = cardBrandMap.GetValueOrDefault(item.S("type"), CardBrand.Visa),
        Color = item.S("color"),
        Status = item.S("status") == "active" ? EntityStatus.Active : EntityStatus.Inactive,
        DueDay = item.ShortOrNull("dueDate") ?? 10,
        ClosingDay = item.ShortOrNull("closingDate") ?? 5,
        CreatedAt = item.DateTimeOffset("createdAt"),
        UpdatedAt = item.DateTimeOffset("updatedAt"),
    });
}

// --- Compras: reagrupa as linhas explodidas do modelo antigo (uma por
// parcela/pessoa/mes) de volta em Purchase + PurchaseShare + PurchaseOccurrence ---
string TitleWithoutSuffixes(string title)
{
    var cleaned = Regex.Replace(title, @"\s*\(\d+/\d+\)", "");
    cleaned = Regex.Replace(cleaned, @"\s*-\s*(Compartilhado|Parte\s+.+)$", "");
    return cleaned.Trim();
}

string GroupKey(Dictionary<string, AttributeValue> t)
{
    var installmentGroup = t.SOrNull("installmentGroup");
    if (installmentGroup is not null) return $"inst:{installmentGroup}";

    var recurringGroup = t.SOrNull("recurringGroup");
    if (recurringGroup is not null) return $"rec:{recurringGroup}";

    if (t.Bool("isShared"))
    {
        return $"shared:{TitleWithoutSuffixes(t.S("title"))}|{t.S("date")}|{t.S("cardId")}";
    }

    return $"solo:{t.S("id")}";
}

var purchaseGroups = transactionsRaw.GroupBy(GroupKey).ToList();
Console.WriteLine($"  -> {purchaseGroups.Count} compras após agrupar as linhas explodidas");

var purchaseCount = 0;
var shareCount = 0;
var occurrenceCount = 0;

foreach (var group in purchaseGroups)
{
    var rows = group.ToList();
    // Ids tem prefixo de timestamp (txn_<epoch_ms>_<random>) — ordenar por id
    // reflete a ordem de criacao, e o primeiro a ser empurrado no loop
    // original e sempre o usuario primario (resolveShares coloca ele em [0]).
    var first = rows.OrderBy(r => r.S("id"), StringComparer.Ordinal).First();

    if (!cardIdMap.TryGetValue(first.S("cardId"), out var newCardId))
    {
        warnings.Add($"{group.Key}: cardId '{first.S("cardId")}' não encontrado — pulado");
        continue;
    }

    if (!userIdMap.TryGetValue(first.S("userId"), out var primaryUserId))
    {
        warnings.Add($"{group.Key}: userId primário '{first.S("userId")}' não encontrado — pulado");
        continue;
    }

    var kind = group.Key.StartsWith("inst:", StringComparison.Ordinal) ? PurchaseKind.Installment
        : group.Key.StartsWith("rec:", StringComparison.Ordinal) ? PurchaseKind.Recurring
        : PurchaseKind.Single;

    // Grupos "shared:" (compartilhada, sem parcela/recorrencia) agrupam por
    // titulo+data+cartao — ou seja, toda linha do grupo ja e a MESMA data. Se
    // o mesmo usuario aparece mais de uma vez ali, so pode ser uma tentativa
    // de criacao duplicada (mesmo padrao de falha ja visto nesta sessao pra
    // parcelas), nunca duas cobrancas de verdade — fica so com a primeira,
    // igual o dedupeCardTransactions do app antigo ja fazia pra esse caso.
    // Pra parcela/recorrencia, cada linha do usuario e um periodo diferente —
    // aí soma mesmo, sao cobrancas distintas de verdade.
    var byUser = rows.GroupBy(r => r.S("userId")).ToList();
    var shareAmounts = new List<(Guid UserId, decimal Amount)>();
    var skip = false;
    foreach (var userGroup in byUser)
    {
        if (!userIdMap.TryGetValue(userGroup.Key, out var shareUserId))
        {
            warnings.Add($"{group.Key}: userId de compartilhamento '{userGroup.Key}' não encontrado — pulado");
            skip = true;
            break;
        }

        var amount = kind == PurchaseKind.Single
            ? userGroup.OrderBy(r => r.S("id"), StringComparer.Ordinal).First().N("amount")
            : userGroup.Sum(r => r.N("amount"));

        if (kind == PurchaseKind.Single && userGroup.Count() > 1)
        {
            warnings.Add($"{group.Key}: usuário '{userGroup.Key}' tinha {userGroup.Count()} linhas duplicadas — mantida só a primeira (dado histórico corrompido, mesmo padrão de falha já visto nesta sessão)");
        }

        shareAmounts.Add((shareUserId, amount));
    }

    if (skip) continue;

    var purchaseId = Guid.CreateVersion7();
    // Pra Single, deriva do que sobrou depois do dedupe acima — nao confia
    // cegamente em originalAmount, que pode refletir um valor "fantasma" de
    // antes de uma escrita parcial ter perdido a linha da outra pessoa
    // (achamos um caso assim: "Refrigerante" com originalAmount=24 mas so
    // uma linha de R$12 recuperavel). Pra parcela/recorrente, originalAmount
    // ja foi validado consistente nesta sessao, mantem.
    var totalAmount = kind == PurchaseKind.Single
        ? shareAmounts.Sum(s => s.Amount)
        : first.NOrNull("originalAmount") ?? first.N("amount");
    var purchaseCreatedAt = first.DateTimeOffset("createdAt");
    var purchaseUpdatedAt = rows.Select(r => r.DateTimeOffset("updatedAt")).Max();
    var isCustomSplit = shareAmounts.Select(s => s.Amount).Distinct().Count() > 1;

    var purchase = new Purchase
    {
        Id = purchaseId,
        CreatedByUserId = primaryUserId,
        CardId = newCardId,
        Title = TitleWithoutSuffixes(first.S("title")),
        Description = first.SOrNull("description"),
        TotalAmount = totalAmount,
        PurchaseDate = rows.Select(r => r.DateOnly("date")).Min(),
        DivisionType = isCustomSplit ? PurchaseDivisionType.Custom : PurchaseDivisionType.Equal,
        Kind = kind,
        TotalInstallments = kind == PurchaseKind.Installment ? first.ShortOrNull("totalInstallments") : null,
        RecurringIntervalMonths = kind == PurchaseKind.Recurring ? (short)1 : null,
        CreatedAt = purchaseCreatedAt,
        UpdatedAt = purchaseUpdatedAt,
    };
    db.Purchases.Add(purchase);
    purchaseCount++;

    foreach (var (userId, amount) in shareAmounts)
    {
        db.PurchaseShares.Add(new PurchaseShare
        {
            Id = Guid.CreateVersion7(),
            PurchaseId = purchaseId,
            UserId = userId,
            ShareAmount = amount,
            IsPrimary = userId == primaryUserId,
            CreatedAt = purchaseCreatedAt,
            UpdatedAt = purchaseUpdatedAt,
        });
        shareCount++;
    }

    // Occurrences: parcela usa currentInstallment (mais fiel que reordenar por
    // data, se uma parcela foi editada fora de ordem); recorrente/avulsa/
    // compartilhada-sem-grupo usa a ordem cronologica das datas distintas.
    if (kind == PurchaseKind.Installment)
    {
        foreach (var installmentGroup in rows.GroupBy(r => (int)r.N("currentInstallment")).OrderBy(g => g.Key))
        {
            db.PurchaseOccurrences.Add(new PurchaseOccurrence
            {
                Id = Guid.CreateVersion7(),
                PurchaseId = purchaseId,
                OccurrenceNumber = installmentGroup.Key,
                DueDate = installmentGroup.First().DateOnly("date"),
                Amount = installmentGroup.Sum(r => r.N("amount")),
                CreatedAt = purchaseCreatedAt,
            });
            occurrenceCount++;
        }
    }
    else if (kind == PurchaseKind.Single)
    {
        // Uma unica ocorrencia (so existe um ponto no tempo pra "solo:"/"shared:"
        // por construcao da chave de agrupamento) — usa a soma dos shares ja
        // deduplicados acima, nao re-soma as linhas brutas (que duplicariam
        // de novo o valor nos 2 casos de escrita corrompida que achamos).
        db.PurchaseOccurrences.Add(new PurchaseOccurrence
        {
            Id = Guid.CreateVersion7(),
            PurchaseId = purchaseId,
            OccurrenceNumber = 1,
            DueDate = purchase.PurchaseDate,
            Amount = totalAmount,
            CreatedAt = purchaseCreatedAt,
        });
        occurrenceCount++;
    }
    else
    {
        var byDate = rows.GroupBy(r => r.DateOnly("date")).OrderBy(g => g.Key).ToList();
        for (var i = 0; i < byDate.Count; i++)
        {
            db.PurchaseOccurrences.Add(new PurchaseOccurrence
            {
                Id = Guid.CreateVersion7(),
                PurchaseId = purchaseId,
                OccurrenceNumber = i + 1,
                DueDate = byDate[i].Key,
                Amount = byDate[i].Sum(r => r.N("amount")),
                CreatedAt = purchaseCreatedAt,
            });
            occurrenceCount++;
        }
    }
}

// --- Pagamentos ---
var entryCount = 0;
foreach (var item in entriesRaw)
{
    if (!userIdMap.TryGetValue(item.S("userId"), out var userId))
    {
        warnings.Add($"entry {item.S("id")}: userId '{item.S("userId")}' não encontrado — pulado");
        continue;
    }

    db.Entries.Add(new Entry
    {
        Id = Guid.CreateVersion7(),
        UserId = userId,
        CreatedByUserId = userId, // o modelo antigo nao guardava quem lancou em nome de quem
        Title = item.S("title"),
        Description = item.SOrNull("description"),
        Amount = item.N("amount"),
        EntryDate = item.DateOnly("date"),
        CreatedAt = item.DateTimeOffset("createdAt"),
        UpdatedAt = item.DateTimeOffset("updatedAt"),
    });
    entryCount++;
}

// --- Tokens de push ---
var pushTokenCount = 0;
foreach (var item in pushTokensRaw)
{
    if (!userIdMap.TryGetValue(item.S("userId"), out var userId))
    {
        warnings.Add($"pushToken: userId '{item.S("userId")}' não encontrado — pulado");
        continue;
    }

    db.PushTokens.Add(new PushToken
    {
        Token = item.S("token"),
        UserId = userId,
        Platform = item.SOrNull("platform") switch
        {
            "ios" => PushPlatform.Ios,
            "web" => PushPlatform.Web,
            _ => PushPlatform.Android,
        },
        DeviceName = item.SOrNull("deviceName"),
        CreatedAt = item.DateTimeOffset("createdAt"),
        UpdatedAt = item.DateTimeOffset("updatedAt"),
    });
    pushTokenCount++;
}

Console.WriteLine();
Console.WriteLine("Gravando no Supabase (uma única transação — tudo ou nada)...");

await using var transaction = await db.Database.BeginTransactionAsync();
try
{
    await db.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}

Console.WriteLine();
Console.WriteLine("=== Concluído ===");
Console.WriteLine($"Usuários: {usersRaw.Count}");
Console.WriteLine($"Cartões: {cardsRaw.Count}");
Console.WriteLine($"Compras: {purchaseCount} (shares={shareCount}, occurrences={occurrenceCount})");
Console.WriteLine($"Pagamentos: {entryCount}");
Console.WriteLine($"Tokens de push: {pushTokenCount}");

if (warnings.Count > 0)
{
    Console.WriteLine();
    Console.WriteLine($"AVISOS ({warnings.Count} itens pulados):");
    foreach (var warning in warnings)
    {
        Console.WriteLine($"  - {warning}");
    }
}

Console.WriteLine();
Console.WriteLine("Nenhum dado foi apagado ou alterado no DynamoDB (somente leitura, nunca chamou Delete/Put/Update).");

return 0;
