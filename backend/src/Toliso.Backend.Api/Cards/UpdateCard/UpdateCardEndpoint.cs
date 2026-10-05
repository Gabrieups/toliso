using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Cards.UpdateCard;

public record UpdateCardRequest(string Name, string Bank, CardBrand Brand, string Color, EntityStatus Status, short DueDay, short ClosingDay);

public static class UpdateCardEndpoint
{
    public static void MapUpdateCardEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPut("/v1/cards/{id:guid}", Handle)
            .AddEndpointFilter<ValidationFilter<UpdateCardRequest>>()
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(Guid id, UpdateCardRequest request, AppDbContext db)
    {
        var card = await db.CreditCards.FindAsync(id) ?? throw new NotFoundException("Cartão não encontrado.");

        card.Name = request.Name;
        card.Bank = request.Bank;
        card.Brand = request.Brand;
        card.Color = request.Color;
        card.Status = request.Status;
        card.DueDay = request.DueDay;
        card.ClosingDay = request.ClosingDay;
        card.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
