using System.Globalization;

namespace Toliso.Backend.Api.Shared;

/// <summary>
/// Calculo de periodo de fatura — porta 1:1 de packages/core/src/period.ts.
/// O ciclo padrao vai do dia de fechamento do cartao (16 por padrao) ate o dia
/// anterior ao fechamento do mes seguinte. Ex.: 16/01 a 15/02 pertencem ao
/// periodo "2025-02". Fonte unica de verdade — Invoices e Reminders usam esta
/// mesma classe, nunca duplicam a regra.
/// </summary>
public static class PeriodCalculator
{
    private const short DefaultClosingDay = 16;

    // Hardcoded (nao via CultureInfo) de proposito — igual ao
    // MONTH_NAMES_SHORT do period.ts original: o app roda com
    // InvariantGlobalization=true (Directory.Build.props), que nao suporta
    // "pt-BR" como CultureInfo em runtime.
    private static readonly string[] MonthNamesShort =
        ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    /// <summary>A que periodo de fatura uma data pertence. Datas a partir do dia de fechamento caem no periodo do mes seguinte.</summary>
    public static string GetInvoicePeriod(DateOnly date, short closingDay = DefaultClosingDay)
    {
        if (date.Day >= closingDay)
        {
            var next = date.AddMonths(1);
            return Format(next.Year, next.Month);
        }

        return Format(date.Year, date.Month);
    }

    public static bool IsInPeriod(DateOnly date, string period, short closingDay = DefaultClosingDay) =>
        GetInvoicePeriod(date, closingDay) == period;

    public static string GetCurrentPeriod(short closingDay = DefaultClosingDay) =>
        GetInvoicePeriod(DateOnly.FromDateTime(DateTime.UtcNow), closingDay);

    /// <summary>Avanca (ou retrocede) offset meses a partir de uma chave "YYYY-MM".</summary>
    public static string ShiftPeriod(string period, int offset)
    {
        var (year, month) = Parse(period);
        var shifted = new DateOnly(year, month, 1).AddMonths(offset);
        return Format(shifted.Year, shifted.Month);
    }

    /// <summary>Data de vencimento real de uma fatura: o dia dueDay dentro do mes do periodo.</summary>
    public static DateOnly GetInvoiceDueDate(string period, short dueDay)
    {
        var (year, month) = Parse(period);
        var lastDayOfMonth = DateTime.DaysInMonth(year, month);
        return new DateOnly(year, month, Math.Min(dueDay, lastDayOfMonth));
    }

    /// <summary>Data de fechamento real de uma fatura (dia closingDay do mes anterior ao periodo).</summary>
    public static DateOnly GetInvoiceClosingDate(string period, short closingDay)
    {
        var (year, month) = Parse(period);
        var target = new DateOnly(year, month, 1).AddMonths(-1);
        var lastDayOfMonth = DateTime.DaysInMonth(target.Year, target.Month);
        return new DateOnly(target.Year, target.Month, Math.Min(closingDay, lastDayOfMonth));
    }

    /// <summary>Rotulo legivel de um periodo, ex.: "fev/2025".</summary>
    public static string GetPeriodDisplay(string period)
    {
        var (year, month) = Parse(period);
        return $"{MonthNamesShort[month - 1]}/{year}";
    }

    private static (int Year, int Month) Parse(string period)
    {
        var parts = period.Split('-');
        return (int.Parse(parts[0], CultureInfo.InvariantCulture), int.Parse(parts[1], CultureInfo.InvariantCulture));
    }

    private static string Format(int year, int month) => $"{year:D4}-{month:D2}";
}
