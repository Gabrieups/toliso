using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Purchases.UpdatePurchase;

public record UpdatePurchaseRequest(string Title, string? Description, decimal Amount, Guid CardId, DateOnly? Date);

public static class UpdatePurchaseEndpoint
{
    public static void MapUpdatePurchaseEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPut("/v1/purchases/{id:guid}", Handle)
            .AddEndpointFilter<ValidationFilter<UpdatePurchaseRequest>>()
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(Guid id, UpdatePurchaseRequest request, AppDbContext db)
    {
        var purchase = await db.Purchases
            .Include(p => p.Shares)
            .Include(p => p.Occurrences)
            .FirstOrDefaultAsync(p => p.Id == id) ?? throw new NotFoundException("Despesa não encontrada.");

        var cardExists = await db.CreditCards.AnyAsync(c => c.Id == request.CardId);
        if (!cardExists)
        {
            throw new NotFoundException("Cartão não encontrado.");
        }

        purchase.Title = request.Title;
        purchase.Description = request.Description;
        purchase.CardId = request.CardId;

        if (request.Amount != purchase.TotalAmount)
        {
            RescaleShares(purchase, request.Amount);
            RescaleOccurrences(purchase, request.Amount);
            purchase.TotalAmount = request.Amount;
        }

        if (request.Date is { } newDate && newDate != purchase.PurchaseDate)
        {
            var monthsDiff = ((newDate.Year - purchase.PurchaseDate.Year) * 12) + (newDate.Month - purchase.PurchaseDate.Month);
            foreach (var occurrence in purchase.Occurrences)
            {
                occurrence.DueDate = occurrence.DueDate.AddMonths(monthsDiff);
            }

            purchase.PurchaseDate = newDate;
        }

        purchase.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    private static void RescaleShares(Purchase purchase, decimal newAmount)
    {
        var factor = newAmount / purchase.TotalAmount;
        var shares = purchase.Shares.ToList();
        var rescaled = shares.Select(s => Math.Round(s.ShareAmount * factor, 2, MidpointRounding.ToZero)).ToList();
        var remainder = newAmount - rescaled.Sum();

        for (var i = 0; i < shares.Count; i++)
        {
            shares[i].ShareAmount = shares[i].IsPrimary ? rescaled[i] + remainder : rescaled[i];
            shares[i].UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    private static void RescaleOccurrences(Purchase purchase, decimal newAmount)
    {
        if (purchase.Kind is PurchaseKind.Single or PurchaseKind.Recurring)
        {
            foreach (var occurrence in purchase.Occurrences)
            {
                occurrence.Amount = newAmount;
            }

            return;
        }

        var factor = newAmount / purchase.TotalAmount;
        var ordered = purchase.Occurrences.OrderBy(o => o.OccurrenceNumber).ToList();
        var rescaled = ordered.Select(o => Math.Round(o.Amount * factor, 2, MidpointRounding.ToZero)).ToList();
        var remainder = newAmount - rescaled.Sum();

        for (var i = 0; i < ordered.Count; i++)
        {
            ordered[i].Amount = i == ordered.Count - 1 ? rescaled[i] + remainder : rescaled[i];
        }
    }
}
