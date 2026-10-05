using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Cards;

public record CardSummary(Guid Id, string Name, string Bank, CardBrand Brand, string Color, EntityStatus Status, short DueDay, short ClosingDay)
{
    public static CardSummary From(CreditCard card) =>
        new(card.Id, card.Name, card.Bank, card.Brand, card.Color, card.Status, card.DueDay, card.ClosingDay);
}
