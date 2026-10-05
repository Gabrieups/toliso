using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Shared;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Notifications;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Reports.SendExpenseReport;

public record SendExpenseReportRequest(Guid UserId, string? Period);

/// <summary>Relatorio de gastos por e-mail — porta de sendUserExpenseReport (apps/web/lib/operations/reports.ts).</summary>
public static class SendExpenseReportEndpoint
{
    public static void MapSendExpenseReportEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/reports/send", Handle)
            .AddEndpointFilter<ValidationFilter<SendExpenseReportRequest>>()
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(SendExpenseReportRequest request, AppDbContext db, IReportEmailSender emailSender)
    {
        var user = await db.Users.FindAsync(request.UserId) ?? throw new NotFoundException("Usuário não encontrado.");
        var targetPeriod = request.Period ?? PeriodCalculator.GetCurrentPeriod();
        var periodDisplay = PeriodCalculator.GetPeriodDisplay(targetPeriod);

        var purchases = await db.Purchases
            .Include(p => p.Shares)
            .Include(p => p.Occurrences)
            .Where(p => p.Shares.Any(s => s.UserId == request.UserId))
            .ToListAsync();

        decimal totalExpenses = 0;
        var occurrenceCount = 0;
        foreach (var purchase in purchases)
        {
            var share = purchase.Shares.First(s => s.UserId == request.UserId);
            var ratio = purchase.TotalAmount == 0 ? 0 : share.ShareAmount / purchase.TotalAmount;

            foreach (var occurrence in purchase.Occurrences)
            {
                if (PeriodCalculator.GetInvoicePeriod(occurrence.DueDate) != targetPeriod)
                {
                    continue;
                }

                totalExpenses += occurrence.Amount * ratio;
                occurrenceCount++;
            }
        }

        var totalPayments = await db.Entries
            .Where(e => e.UserId == request.UserId)
            .ToListAsync();
        var periodPayments = totalPayments.Where(e => PeriodCalculator.GetInvoicePeriod(e.EntryDate) == targetPeriod).Sum(e => e.Amount);

        var body = BuildHtml(user.Name, periodDisplay, totalExpenses, periodPayments, occurrenceCount);
        await emailSender.SendAsync(user.Email, $"Relatório de Gastos - {periodDisplay}", body);

        return Results.Ok(new { message = $"Email enviado para {user.Name}!" });
    }

    private static string BuildHtml(string userName, string periodDisplay, decimal totalExpenses, decimal totalPayments, int count)
    {
        var balance = totalExpenses - totalPayments;
        return string.Format(
            CultureInfo.InvariantCulture,
            "<p>Olá, {0}! Resumo de {1}: gastos R$ {2:F2}, pagamentos R$ {3:F2}, saldo R$ {4:F2} ({5} lançamentos).</p>",
            userName,
            periodDisplay,
            totalExpenses,
            totalPayments,
            balance,
            count);
    }
}
