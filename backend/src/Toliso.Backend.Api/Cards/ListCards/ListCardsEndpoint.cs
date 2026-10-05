using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;

namespace Toliso.Backend.Api.Cards.ListCards;

public static class ListCardsEndpoint
{
    public static void MapListCardsEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/cards", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(AppDbContext db)
    {
        var cards = await db.CreditCards.OrderBy(c => c.Name).ToListAsync();
        return Results.Ok(cards.Select(CardSummary.From));
    }
}
