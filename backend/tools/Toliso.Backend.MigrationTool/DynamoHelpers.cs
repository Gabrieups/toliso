using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace Toliso.Backend.MigrationTool;

/// <summary>
/// Scan paginado — a mesma licao aprendida nesta sessao com o bug do app
/// antigo: um Scan sem seguir o LastEvaluatedKey so devolve a primeira
/// pagina (limite de 1MB) e descarta o resto silenciosamente.
/// </summary>
public static class DynamoHelpers
{
    public static async Task<List<Dictionary<string, AttributeValue>>> ScanAllAsync(IAmazonDynamoDB client, string tableName)
    {
        var items = new List<Dictionary<string, AttributeValue>>();
        Dictionary<string, AttributeValue>? exclusiveStartKey = null;

        do
        {
            var response = await client.ScanAsync(new ScanRequest
            {
                TableName = tableName,
                ExclusiveStartKey = exclusiveStartKey,
            });
            items.AddRange(response.Items);
            exclusiveStartKey = response.LastEvaluatedKey is { Count: > 0 } ? response.LastEvaluatedKey : null;
        } while (exclusiveStartKey is not null);

        return items;
    }

    public static string S(this Dictionary<string, AttributeValue> item, string key) => item[key].S;

    public static string? SOrNull(this Dictionary<string, AttributeValue> item, string key) =>
        item.TryGetValue(key, out var value) && !value.NULL ? value.S : null;

    // Arredonda pra 2 casas na extracao (nao na soma): o app antigo fazia
    // divisoes em ponto flutuante sem arredondar (ex.: 3838.88/84 =
    // 45.70095238095239...). Se cada linha ja entra arredondada, a soma por
    // ocorrencia (data/parcela) e a soma por pessoa (share) sempre batem
    // exatamente entre si — somar e invariante a particionamento quando os
    // valores somados ja sao os mesmos numeros fixos nas duas contas.
    public static decimal N(this Dictionary<string, AttributeValue> item, string key) =>
        Math.Round(decimal.Parse(item[key].N), 2, MidpointRounding.AwayFromZero);

    public static decimal? NOrNull(this Dictionary<string, AttributeValue> item, string key) =>
        item.TryGetValue(key, out var value) && !value.NULL
            ? Math.Round(decimal.Parse(value.N), 2, MidpointRounding.AwayFromZero)
            : null;

    public static short? ShortOrNull(this Dictionary<string, AttributeValue> item, string key) =>
        item.TryGetValue(key, out var value) && !value.NULL ? short.Parse(value.N) : null;

    public static bool Bool(this Dictionary<string, AttributeValue> item, string key) =>
        item.TryGetValue(key, out var value) && value.BOOL;

    public static DateTimeOffset DateTimeOffset(this Dictionary<string, AttributeValue> item, string key) =>
        System.DateTimeOffset.Parse(item[key].S);

    public static DateOnly DateOnly(this Dictionary<string, AttributeValue> item, string key) =>
        System.DateOnly.FromDateTime(System.DateTimeOffset.Parse(item[key].S).UtcDateTime);
}
