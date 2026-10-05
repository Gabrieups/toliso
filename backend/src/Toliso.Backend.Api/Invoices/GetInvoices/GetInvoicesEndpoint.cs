using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Invoices.GetInvoices;

public record InvoicesResponse(IReadOnlyList<InvoiceView> Invoices, IReadOnlyList<PaymentBlockView> PaymentBlocks);

/// <summary>Faturas por cartao/periodo do usuario autenticado. So leitura — o calculo vive em <see cref="InvoiceCalculator"/>.</summary>
public static class GetInvoicesEndpoint
{
    public static void MapGetInvoicesEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/invoices", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var isAdmin = principal.IsInRole("Admin");

        var cards = await db.CreditCards.Where(c => c.Status == EntityStatus.Active).ToListAsync();

        var purchasesQuery = db.Purchases.Include(p => p.Shares).Include(p => p.Occurrences).AsQueryable();
        if (!isAdmin)
        {
            purchasesQuery = purchasesQuery.Where(p => p.CreatedByUserId == userId || p.Shares.Any(s => s.UserId == userId));
        }

        var purchases = await purchasesQuery.ToListAsync();

        var entriesQuery = db.Entries.AsQueryable();
        if (!isAdmin)
        {
            entriesQuery = entriesQuery.Where(e => e.UserId == userId);
        }

        var entries = await entriesQuery.ToListAsync();

        var (invoices, paymentBlocks) = InvoiceCalculator.Calculate(cards, purchases, entries, userId, isAdmin);
        return Results.Ok(new InvoicesResponse(invoices, paymentBlocks));
    }
}
