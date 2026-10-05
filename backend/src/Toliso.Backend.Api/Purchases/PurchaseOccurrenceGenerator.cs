using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Purchases;

/// <summary>
/// Gera as linhas de <see cref="PurchaseOccurrence"/> — quando cada cobranca
/// de uma compra acontece. Parcelamento gera todas as parcelas de uma vez
/// (sao finitas); recorrencia gera so um horizonte rolante de alguns meses a
/// frente (nunca mais os "gera 12 meses e para" do modelo antigo) e e
/// completada depois por <see cref="TopUp"/>, chamado pelo job de lembretes.
/// </summary>
public static class PurchaseOccurrenceGenerator
{
    /// <summary>Quantos meses de recorrencia ficam sempre pre-gerados a frente.</summary>
    public const int RecurringHorizonMonths = 3;

    public static List<PurchaseOccurrence> GenerateInitial(Purchase purchase)
    {
        return purchase.Kind switch
        {
            PurchaseKind.Single => [NewOccurrence(purchase.Id, 1, purchase.PurchaseDate, purchase.TotalAmount)],
            PurchaseKind.Installment => GenerateInstallments(purchase),
            PurchaseKind.Recurring => GenerateRecurringHorizon(purchase, fromOccurrenceNumber: 1, asOf: purchase.PurchaseDate),
            _ => throw new ArgumentOutOfRangeException(nameof(purchase), purchase.Kind, "Kind de compra desconhecido."),
        };
    }

    /// <summary>
    /// Estende o horizonte de uma compra recorrente se ele estiver acabando —
    /// chamado periodicamente (job de lembretes), nunca na criacao.
    /// </summary>
    public static List<PurchaseOccurrence> TopUp(Purchase purchase, int lastOccurrenceNumber, DateOnly lastDueDate, DateOnly today)
    {
        if (purchase.Kind != PurchaseKind.Recurring)
        {
            return [];
        }

        var horizonLimit = today.AddMonths(RecurringHorizonMonths);
        if (lastDueDate >= horizonLimit)
        {
            return [];
        }

        return GenerateRecurringHorizon(
            purchase,
            fromOccurrenceNumber: lastOccurrenceNumber + 1,
            asOf: lastDueDate.AddMonths(purchase.RecurringIntervalMonths ?? 1),
            horizonLimit: horizonLimit);
    }

    private static List<PurchaseOccurrence> GenerateInstallments(Purchase purchase)
    {
        var count = purchase.TotalInstallments ?? 1;
        var baseAmount = Math.Round(purchase.TotalAmount / count, 2, MidpointRounding.ToZero);
        var remainder = purchase.TotalAmount - (baseAmount * count);

        var occurrences = new List<PurchaseOccurrence>(count);
        for (var number = 1; number <= count; number++)
        {
            var amount = number == count ? baseAmount + remainder : baseAmount;
            var dueDate = purchase.PurchaseDate.AddMonths(number - 1);
            occurrences.Add(NewOccurrence(purchase.Id, number, dueDate, amount));
        }

        return occurrences;
    }

    private static List<PurchaseOccurrence> GenerateRecurringHorizon(
        Purchase purchase,
        int fromOccurrenceNumber,
        DateOnly asOf,
        DateOnly? horizonLimit = null)
    {
        var interval = purchase.RecurringIntervalMonths ?? 1;
        var limit = horizonLimit ?? asOf.AddMonths(RecurringHorizonMonths);

        var occurrences = new List<PurchaseOccurrence>();
        var dueDate = asOf;
        var number = fromOccurrenceNumber;

        while (dueDate < limit)
        {
            if (purchase.RecurringEndsAt is { } endsAt && dueDate > endsAt)
            {
                break;
            }

            occurrences.Add(NewOccurrence(purchase.Id, number, dueDate, purchase.TotalAmount));
            dueDate = dueDate.AddMonths(interval);
            number++;
        }

        return occurrences;
    }

    private static PurchaseOccurrence NewOccurrence(Guid purchaseId, int number, DateOnly dueDate, decimal amount) => new()
    {
        Id = Guid.CreateVersion7(),
        PurchaseId = purchaseId,
        OccurrenceNumber = number,
        DueDate = dueDate,
        Amount = amount,
        CreatedAt = DateTimeOffset.UtcNow,
    };
}
