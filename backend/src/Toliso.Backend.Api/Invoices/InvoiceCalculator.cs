using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared;

namespace Toliso.Backend.Api.Invoices;

public record InvoiceView(
    Guid CardId,
    string CardName,
    short DueDay,
    short ClosingDay,
    string Period,
    string PeriodDisplay,
    decimal TotalExpenses,
    decimal PaymentsApplied,
    decimal Balance);

public record PaymentBlockView(string Period, string PeriodDisplay, decimal TotalEntries);

/// <summary>
/// Monta as faturas por cartao/periodo — porta de buildInvoices
/// (packages/core/src/invoice.ts). Usado tanto pelo endpoint de consulta
/// (GetInvoices) quanto pelo job de lembretes (Reminders), pra nunca ter essa
/// regra implementada em dois lugares.
/// </summary>
public static class InvoiceCalculator
{
    public static (List<InvoiceView> Invoices, List<PaymentBlockView> PaymentBlocks) Calculate(
        IReadOnlyCollection<CreditCard> activeCards,
        IReadOnlyCollection<Purchase> visiblePurchases,
        IReadOnlyCollection<Entry> visibleEntries,
        Guid? userId,
        bool isAdmin)
    {
        var invoices = new List<InvoiceView>();

        foreach (var card in activeCards)
        {
            var cardPurchases = visiblePurchases.Where(p => p.CardId == card.Id);

            var expensesByPeriod = new Dictionary<string, decimal>();
            foreach (var purchase in cardPurchases)
            {
                var ratio = isAdmin ? 1m : RatioForUser(purchase, userId);
                foreach (var occurrence in purchase.Occurrences)
                {
                    var period = PeriodCalculator.GetInvoicePeriod(occurrence.DueDate, card.ClosingDay);
                    expensesByPeriod[period] = expensesByPeriod.GetValueOrDefault(period) + (occurrence.Amount * ratio);
                }
            }

            var paymentsByPeriod = visibleEntries
                .GroupBy(e => PeriodCalculator.GetInvoicePeriod(e.EntryDate, card.ClosingDay))
                .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

            foreach (var (period, totalExpenses) in expensesByPeriod)
            {
                var paymentsApplied = paymentsByPeriod.GetValueOrDefault(period);
                invoices.Add(new InvoiceView(
                    card.Id,
                    card.Name,
                    card.DueDay,
                    card.ClosingDay,
                    period,
                    PeriodCalculator.GetPeriodDisplay(period),
                    totalExpenses,
                    paymentsApplied,
                    totalExpenses - paymentsApplied));
            }
        }

        var paymentBlocks = visibleEntries
            .GroupBy(e => PeriodCalculator.GetInvoicePeriod(e.EntryDate))
            .Select(g => new PaymentBlockView(g.Key, PeriodCalculator.GetPeriodDisplay(g.Key), g.Sum(e => e.Amount)))
            .OrderByDescending(b => b.Period)
            .ToList();

        return (invoices.OrderByDescending(i => i.Period).ToList(), paymentBlocks);
    }

    private static decimal RatioForUser(Purchase purchase, Guid? userId)
    {
        var share = purchase.Shares.FirstOrDefault(s => s.UserId == userId);
        if (share is null || purchase.TotalAmount == 0)
        {
            return 0m;
        }

        return share.ShareAmount / purchase.TotalAmount;
    }
}
