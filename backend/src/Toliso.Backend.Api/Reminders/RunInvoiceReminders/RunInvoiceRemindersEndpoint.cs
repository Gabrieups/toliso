using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Invoices;
using Toliso.Backend.Api.Purchases;
using Toliso.Backend.Api.Shared;
using Toliso.Backend.Api.Shared.Notifications;

namespace Toliso.Backend.Api.Reminders.RunInvoiceReminders;

/// <summary>
/// Checagem diaria de fechamento/vencimento de fatura (dispara pelo cron do
/// host) — porta de /api/v1/cron/invoice-reminders. Tambem e aqui que o
/// horizonte de compras recorrentes e esticado (ver
/// <see cref="PurchaseOccurrenceGenerator.TopUp"/>), ja que os dois sao
/// jobs "rodar todo dia" e nao faz sentido ter dois crons separados pra isso.
/// </summary>
public static class RunInvoiceRemindersEndpoint
{
    private static readonly int[] ClosingReminderDays = [3, 1];
    private static readonly int[] DueReminderDays = [3, 1, 0];
    private const int OverdueReminderDay = -1;

    public static void MapRunInvoiceRemindersEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/reminders/invoices", Handle).AllowAnonymous();
    }

    private static async Task<IResult> Handle(HttpRequest request, AppDbContext db, IConfiguration config, IPushSender pushSender)
    {
        var expectedSecret = config["Reminders:Secret"];
        var authHeader = request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(expectedSecret) || authHeader != $"Bearer {expectedSecret}")
        {
            return Results.Unauthorized();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var topUppedOccurrences = await TopUpRecurringPurchasesAsync(db, today);

        var admins = await db.Users.Where(u => u.Role == UserRole.Admin && u.Status == EntityStatus.Active).ToListAsync();
        var cards = await db.CreditCards.Where(c => c.Status == EntityStatus.Active).ToListAsync();

        var notificationsSent = 0;
        foreach (var admin in admins)
        {
            var purchases = await db.Purchases.Include(p => p.Shares).Include(p => p.Occurrences).ToListAsync();
            var entries = await db.Entries.ToListAsync();
            var (invoices, _) = InvoiceCalculator.Calculate(cards, purchases, entries, admin.Id, isAdmin: true);

            foreach (var invoice in invoices)
            {
                if (invoice.Balance <= 0.005m)
                {
                    continue;
                }

                var dueDate = PeriodCalculator.GetInvoiceDueDate(invoice.Period, invoice.DueDay);
                var closingDate = PeriodCalculator.GetInvoiceClosingDate(invoice.Period, invoice.ClosingDay);

                var daysToDue = today.DayNumber - dueDate.DayNumber;
                var daysToClosing = today.DayNumber - closingDate.DayNumber;

                if (DueReminderDays.Contains(-daysToDue))
                {
                    await pushSender.SendAsync([admin.Id], $"Fatura do {invoice.CardName} vence em breve", $"Saldo de {invoice.Balance:C} — {invoice.PeriodDisplay}.");
                    notificationsSent++;
                }
                else if (-daysToDue == OverdueReminderDay)
                {
                    await pushSender.SendAsync([admin.Id], $"Fatura do {invoice.CardName} venceu", $"Saldo em aberto de {invoice.Balance:C} — {invoice.PeriodDisplay}.");
                    notificationsSent++;
                }

                if (ClosingReminderDays.Contains(-daysToClosing))
                {
                    await pushSender.SendAsync([admin.Id], $"Fatura do {invoice.CardName} fecha em breve", $"Acumula {invoice.TotalExpenses:C} até agora — {invoice.PeriodDisplay}.");
                    notificationsSent++;
                }
            }
        }

        return Results.Ok(new { admins.Count, notificationsSent, topUppedOccurrences });
    }

    private static async Task<int> TopUpRecurringPurchasesAsync(AppDbContext db, DateOnly today)
    {
        var recurringPurchases = await db.Purchases
            .Include(p => p.Occurrences)
            .Where(p => p.Kind == PurchaseKind.Recurring)
            .ToListAsync();

        var created = 0;
        foreach (var purchase in recurringPurchases)
        {
            var last = purchase.Occurrences.OrderByDescending(o => o.OccurrenceNumber).FirstOrDefault();
            if (last is null)
            {
                continue;
            }

            var newOccurrences = PurchaseOccurrenceGenerator.TopUp(purchase, last.OccurrenceNumber, last.DueDate, today);
            if (newOccurrences.Count == 0)
            {
                continue;
            }

            db.PurchaseOccurrences.AddRange(newOccurrences);
            created += newOccurrences.Count;
        }

        if (created > 0)
        {
            await db.SaveChangesAsync();
        }

        return created;
    }
}
