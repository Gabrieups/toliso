namespace Toliso.Backend.Api.Data.Entities;

/// <summary>
/// Cabecalho de uma compra. Substitui a antiga tabela "transactions" explodida
/// em uma linha por parcela/pessoa/mes — aqui a compra existe uma unica vez;
/// quem deve quanto vive em <see cref="PurchaseShare"/> e quando cada cobranca
/// acontece vive em <see cref="PurchaseOccurrence"/>.
/// </summary>
public class Purchase
{
    public Guid Id { get; init; }
    public required Guid CreatedByUserId { get; set; }
    public required Guid CardId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }

    /// <summary>Valor cheio da compra, antes de dividir entre pessoas ou parcelas.</summary>
    public required decimal TotalAmount { get; set; }

    public required DateOnly PurchaseDate { get; set; }
    public PurchaseDivisionType DivisionType { get; set; } = PurchaseDivisionType.Equal;
    public required PurchaseKind Kind { get; set; }

    /// <summary>Preenchido só quando <see cref="Kind"/> == Installment (2-60).</summary>
    public short? TotalInstallments { get; set; }

    /// <summary>Preenchido só quando <see cref="Kind"/> == Recurring. Sempre 1 na v1.</summary>
    public short? RecurringIntervalMonths { get; set; }

    /// <summary>Preenchido só quando <see cref="Kind"/> == Recurring. Nulo = recorrencia aberta.</summary>
    public DateOnly? RecurringEndsAt { get; set; }

    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<PurchaseShare> Shares { get; init; } = [];
    public ICollection<PurchaseOccurrence> Occurrences { get; init; } = [];
}
