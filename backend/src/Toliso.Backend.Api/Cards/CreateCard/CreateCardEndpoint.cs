using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Cards.CreateCard;

public record CreateCardRequest(
    string Name,
    string Bank,
    CardBrand Brand,
    string Color,
    EntityStatus Status = EntityStatus.Active,
    short DueDay = 10,
    short ClosingDay = 5);

public static class CreateCardEndpoint
{
    public static void MapCreateCardEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/cards", Handle)
            .AddEndpointFilter<ValidationFilter<CreateCardRequest>>()
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(CreateCardRequest request, AppDbContext db)
    {
        var now = DateTimeOffset.UtcNow;
        var card = new CreditCard
        {
            Id = Guid.CreateVersion7(),
            Name = request.Name,
            Bank = request.Bank,
            Brand = request.Brand,
            Color = request.Color,
            Status = request.Status,
            DueDay = request.DueDay,
            ClosingDay = request.ClosingDay,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.CreditCards.Add(card);
        await db.SaveChangesAsync();

        return Results.Created($"/v1/cards/{card.Id}", CardSummary.From(card));
    }
}
