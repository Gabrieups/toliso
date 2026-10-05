using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Purchases.ListPurchases;

public record PurchaseShareItem(Guid UserId, decimal ShareAmount, bool IsPrimary);

public record PurchaseOccurrenceItem(int OccurrenceNumber, DateOnly DueDate, decimal Amount);

public record PurchaseListItem(
    Guid Id,
    string Title,
    string? Description,
    decimal TotalAmount,
    Guid CardId,
    PurchaseKind Kind,
    DateOnly PurchaseDate,
    IReadOnlyList<PurchaseShareItem> Shares,
    IReadOnlyList<PurchaseOccurrenceItem> Occurrences);

/// <summary>Admin ve todas as compras; demais usuarios veem as suas + as que foram divididas com eles.</summary>
public static class ListPurchasesEndpoint
{
    public static void MapListPurchasesEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/purchases", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var isAdmin = principal.IsInRole("Admin");

        var query = db.Purchases
            .Include(p => p.Shares)
            .Include(p => p.Occurrences)
            .AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(p => p.CreatedByUserId == userId || p.Shares.Any(s => s.UserId == userId));
        }

        var purchases = await query.OrderByDescending(p => p.PurchaseDate).ToListAsync();

        var items = purchases.Select(p => new PurchaseListItem(
            p.Id,
            p.Title,
            p.Description,
            p.TotalAmount,
            p.CardId,
            p.Kind,
            p.PurchaseDate,
            p.Shares.Select(s => new PurchaseShareItem(s.UserId, s.ShareAmount, s.IsPrimary)).ToList(),
            p.Occurrences.OrderBy(o => o.OccurrenceNumber).Select(o => new PurchaseOccurrenceItem(o.OccurrenceNumber, o.DueDate, o.Amount)).ToList()));

        return Results.Ok(items);
    }
}
