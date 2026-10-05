namespace Toliso.Backend.Api.Data.Entities;

/// <summary>
/// Uma cobranca datada de uma compra: a parcela N de uma compra parcelada, o
/// mes N de uma recorrencia, ou a unica ocorrencia de uma compra avulsa.
/// Unifica o que antes eram duas logicas separadas (installmentGroup vs
/// recurringGroup) numa unica tabela — quem le fatura/periodo nunca precisa
/// saber qual "kind" a compra tem, so junta Purchase + Occurrence + Card.
/// </summary>
public class PurchaseOccurrence
{
    public Guid Id { get; init; }
    public required Guid PurchaseId { get; set; }
    public required int OccurrenceNumber { get; set; }
    public required DateOnly DueDate { get; set; }

    /// <summary>Valor cheio desta ocorrencia (antes de aplicar a fatia de cada PurchaseShare).</summary>
    public required decimal Amount { get; set; }

    public DateTimeOffset CreatedAt { get; init; }

    public Purchase? Purchase { get; init; }
}
