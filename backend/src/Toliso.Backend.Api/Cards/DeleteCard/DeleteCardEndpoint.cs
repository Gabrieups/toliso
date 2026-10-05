using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.Api.Cards.DeleteCard;

/// <summary>"Exclui" um cartao — na pratica desativa, mesma razao do DeleteUser (FK RESTRICT com historico de compras).</summary>
public static class DeleteCardEndpoint
{
    public static void MapDeleteCardEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapDelete("/v1/cards/{id:guid}", Handle).RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(Guid id, AppDbContext db)
    {
        var card = await db.CreditCards.FindAsync(id) ?? throw new NotFoundException("Cartão não encontrado.");
        card.Status = EntityStatus.Inactive;
        card.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
