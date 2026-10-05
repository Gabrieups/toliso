using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Toliso.Backend.Api.Auth.Login;
using Toliso.Backend.Api.Cards.CreateCard;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Invoices.GetInvoices;
using Toliso.Backend.Api.Purchases.CreatePurchase;
using Toliso.Backend.IntegrationTests.Fixtures;

namespace Toliso.Backend.IntegrationTests;

/// <summary>
/// Ponta a ponta contra um Postgres real (Testcontainers): login, criar
/// cartao, criar uma compra parcelada e dividida entre duas pessoas, e
/// conferir que a fatura bate — a mesma trilha que a secao de Verificacao do
/// plano de implementacao pede.
/// </summary>
public class PurchaseFlowTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    [Fact]
    public async Task Compra_parcelada_e_dividida_aparece_corretamente_na_fatura()
    {
        var (adminId, partnerId) = await SeedUsersAsync();
        var client = fixture.CreateClient();

        var loginResponse = await client.PostAsJsonAsync("/v1/auth/login", new LoginRequest("admin@teste.com", "senha-forte-123"));
        loginResponse.EnsureSuccessStatusCode();
        var login = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", login!.Token);

        var cardResponse = await client.PostAsJsonAsync(
            "/v1/cards",
            new CreateCardRequest("Cartão Teste", "Banco Teste", CardBrand.Visa, "#000000", DueDay: 10, ClosingDay: 16));
        cardResponse.EnsureSuccessStatusCode();
        var card = await cardResponse.Content.ReadFromJsonAsync<CardSummaryDto>();

        var purchaseResponse = await client.PostAsJsonAsync(
            "/v1/purchases",
            new CreatePurchaseRequest(
                Title: "Geladeira",
                Description: null,
                Amount: 300m,
                CardId: card!.Id,
                Installments: 3,
                IsShared: true,
                IsRecurring: false,
                DivisionType: PurchaseDivisionType.Equal,
                SharedUserIds: [partnerId],
                CustomShares: null,
                TargetUserId: null,
                Date: new DateOnly(2025, 1, 10)));

        if (!purchaseResponse.IsSuccessStatusCode)
        {
            var body = await purchaseResponse.Content.ReadAsStringAsync();
            throw new Exception($"Falha ao criar compra ({purchaseResponse.StatusCode}): {body}");
        }

        var invoicesResponse = await client.GetAsync("/v1/invoices");
        if (!invoicesResponse.IsSuccessStatusCode)
        {
            var body = await invoicesResponse.Content.ReadAsStringAsync();
            throw new Exception($"Falha ao listar faturas ({invoicesResponse.StatusCode}): {body}");
        }

        var invoices = await invoicesResponse.Content.ReadFromJsonAsync<InvoicesResponse>();

        // Admin ve o valor CHEIO de cada parcela (100 por mes), nao so a sua metade —
        // listagem de admin reflete a soma de todos os shares, igual a fatura real do cartao.
        invoices!.Invoices.Should().Contain(i => i.CardId == card.Id && i.TotalExpenses == 100m);
        invoices.Invoices.Sum(i => i.TotalExpenses).Should().Be(300m);
    }

    private async Task<(Guid AdminId, Guid PartnerId)> SeedUsersAsync()
    {
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTimeOffset.UtcNow;
        var admin = new User
        {
            Id = Guid.CreateVersion7(),
            Email = "admin@teste.com",
            Name = "Admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("senha-forte-123"),
            Role = UserRole.Admin,
            Status = EntityStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var partner = new User
        {
            Id = Guid.CreateVersion7(),
            Email = "partner@teste.com",
            Name = "Parceiro",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("senha-forte-123"),
            Role = UserRole.User,
            Status = EntityStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Users.AddRange(admin, partner);
        await db.SaveChangesAsync();

        return (admin.Id, partner.Id);
    }

    private record CardSummaryDto(Guid Id);
}
