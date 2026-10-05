namespace Toliso.Backend.Api.Data.Entities;

/// <summary>
/// Quanto uma pessoa especifica deve de uma compra. Substitui os arrays
/// soltos "sharedWith"/"sharedUserNames" do modelo antigo.
/// </summary>
public class PurchaseShare
{
    public Guid Id { get; init; }
    public required Guid PurchaseId { get; set; }
    public required Guid UserId { get; set; }

    /// <summary>Fatia desta pessoa em <see cref="Purchase.TotalAmount"/>. Constante durante toda a vida da compra.</summary>
    public required decimal ShareAmount { get; set; }

    /// <summary>A pessoa "dona"/beneficiaria principal da compra (quem a registrou ou em nome de quem foi lancada).</summary>
    public bool IsPrimary { get; set; }

    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Purchase? Purchase { get; init; }
}
