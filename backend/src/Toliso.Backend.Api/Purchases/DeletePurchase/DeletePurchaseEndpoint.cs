using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Notifications;

namespace Toliso.Backend.Api.Purchases.DeletePurchase;

/// <summary>
/// Apaga uma compra. Um unico DELETE com ON DELETE CASCADE remove shares e
/// occurrences atomicamente — substitui a antiga ramificacao de tres
/// caminhos (recurringGroup / installmentGroup / linha solta) que deixava
/// linhas orfas quando so um dos tres era tratado.
/// </summary>
public static class DeletePurchaseEndpoint
{
    public static void MapDeletePurchaseEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapDelete("/v1/purchases/{id:guid}", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(Guid id, ClaimsPrincipal principal, AppDbContext db, IPushSender pushSender)
    {
        var purchase = await db.Purchases.FindAsync(id) ?? throw new NotFoundException("Despesa não encontrada.");
        var isAdmin = principal.IsInRole("Admin");

        db.Purchases.Remove(purchase);
        await db.SaveChangesAsync();

        if (!isAdmin)
        {
            var adminIds = await db.Users
                .Where(u => u.Role == UserRole.Admin && u.Status == EntityStatus.Active)
                .Select(u => u.Id)
                .ToListAsync();

            if (adminIds.Count > 0)
            {
                await pushSender.SendAsync(adminIds, "Despesa excluída", $"\"{purchase.Title}\" ({purchase.TotalAmount:C}) foi excluída.");
            }
        }

        return Results.NoContent();
    }
}
