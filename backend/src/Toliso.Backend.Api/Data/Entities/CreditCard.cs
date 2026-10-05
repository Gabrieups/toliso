namespace Toliso.Backend.Api.Data.Entities;

public class CreditCard
{
    public Guid Id { get; init; }
    public required string Name { get; set; }
    public required string Bank { get; set; }
    public CardBrand Brand { get; set; }
    public required string Color { get; set; }
    public EntityStatus Status { get; set; } = EntityStatus.Active;

    /// <summary>Dia do mês (1-31) em que a fatura fecha.</summary>
    public short ClosingDay { get; set; } = 5;

    /// <summary>Dia do mês (1-31) em que a fatura vence.</summary>
    public short DueDay { get; set; } = 10;

    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; set; }
}
