namespace Toliso.Backend.Api.Data.Entities;

/// <summary>Um pagamento registrado por um usuario (abate o saldo da fatura).</summary>
public class Entry
{
    public Guid Id { get; init; }
    public required Guid UserId { get; set; }
    public required Guid CreatedByUserId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required decimal Amount { get; set; }
    public required DateOnly EntryDate { get; set; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; set; }
}
