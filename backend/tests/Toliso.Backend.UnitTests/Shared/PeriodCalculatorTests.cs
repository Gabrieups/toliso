using FluentAssertions;
using Toliso.Backend.Api.Shared;

namespace Toliso.Backend.UnitTests.Shared;

public class PeriodCalculatorTests
{
    [Theory]
    [InlineData(2025, 1, 15, 16, "2025-01")]
    [InlineData(2025, 1, 16, 16, "2025-02")]
    [InlineData(2025, 12, 20, 16, "2026-01")]
    [InlineData(2025, 1, 8, 9, "2025-01")]
    [InlineData(2025, 1, 9, 9, "2025-02")]
    public void GetInvoicePeriod_bucketa_pelo_dia_de_fechamento(int year, int month, int day, short closingDay, string expected)
    {
        var date = new DateOnly(year, month, day);
        PeriodCalculator.GetInvoicePeriod(date, closingDay).Should().Be(expected);
    }

    [Fact]
    public void IsInPeriod_reflete_GetInvoicePeriod()
    {
        var date = new DateOnly(2025, 3, 16);
        PeriodCalculator.IsInPeriod(date, "2025-04").Should().BeTrue();
        PeriodCalculator.IsInPeriod(date, "2025-03").Should().BeFalse();
    }

    [Fact]
    public void ShiftPeriod_avanca_e_retrocede_meses_virando_o_ano()
    {
        PeriodCalculator.ShiftPeriod("2025-12", 1).Should().Be("2026-01");
        PeriodCalculator.ShiftPeriod("2026-01", -1).Should().Be("2025-12");
    }

    [Fact]
    public void GetInvoiceDueDate_usa_o_dia_informado_dentro_do_mes_do_periodo()
    {
        PeriodCalculator.GetInvoiceDueDate("2025-02", 10).Should().Be(new DateOnly(2025, 2, 10));
    }

    [Fact]
    public void GetInvoiceDueDate_nao_estoura_em_meses_curtos()
    {
        PeriodCalculator.GetInvoiceDueDate("2025-02", 31).Should().Be(new DateOnly(2025, 2, 28));
    }

    [Fact]
    public void GetInvoiceClosingDate_usa_o_mes_anterior_ao_periodo()
    {
        PeriodCalculator.GetInvoiceClosingDate("2025-02", 16).Should().Be(new DateOnly(2025, 1, 16));
    }
}
