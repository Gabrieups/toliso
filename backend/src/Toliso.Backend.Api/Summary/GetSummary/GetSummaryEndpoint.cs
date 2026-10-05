using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Auth;
using Toliso.Backend.Api.Cards;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Entries.CreateEntry;
using Toliso.Backend.Api.Purchases.ListPurchases;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.Api.Summary.GetSummary;

public record SummaryResponse(
    UserSummary User,
    IReadOnlyList<PurchaseListItem> Purchases,
    IReadOnlyList<EntryResponse> Entries,
    IReadOnlyList<CardSummary> Cards,
    DateTimeOffset SyncedAt);

/// <summary>
/// Carga inicial do app em uma unica requisicao — o mobile roda em rede
/// movel, onde cada round-trip custa caro; agrupar tudo aqui e bem mais
/// rapido do que tres chamadas separadas.
/// </summary>
public static class GetSummaryEndpoint
{
    public static void MapGetSummaryEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/summary", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var isAdmin = principal.IsInRole("Admin");

        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Usuário não encontrado.");

        var purchasesQuery = db.Purchases.Include(p => p.Shares).Include(p => p.Occurrences).AsQueryable();
        var entriesQuery = db.Entries.AsQueryable();
        if (!isAdmin)
        {
            purchasesQuery = purchasesQuery.Where(p => p.CreatedByUserId == userId || p.Shares.Any(s => s.UserId == userId));
            entriesQuery = entriesQuery.Where(e => e.UserId == userId);
        }

        var purchases = await purchasesQuery.OrderByDescending(p => p.PurchaseDate).ToListAsync();
        var entries = await entriesQuery.OrderByDescending(e => e.EntryDate).ToListAsync();
        var cards = await db.CreditCards.OrderBy(c => c.Name).ToListAsync();

        var purchaseItems = purchases.Select(p => new PurchaseListItem(
            p.Id,
            p.Title,
            p.Description,
            p.TotalAmount,
            p.CardId,
            p.Kind,
            p.PurchaseDate,
            p.Shares.Select(s => new PurchaseShareItem(s.UserId, s.ShareAmount, s.IsPrimary)).ToList(),
            p.Occurrences.OrderBy(o => o.OccurrenceNumber).Select(o => new PurchaseOccurrenceItem(o.OccurrenceNumber, o.DueDate, o.Amount)).ToList()));

        var entryItems = entries.Select(e => new EntryResponse(e.Id, e.UserId, e.Title, e.Amount, e.EntryDate));

        return Results.Ok(new SummaryResponse(
            UserSummary.From(user),
            purchaseItems.ToList(),
            entryItems.ToList(),
            cards.Select(CardSummary.From).ToList(),
            DateTimeOffset.UtcNow));
    }
}
