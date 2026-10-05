using FluentAssertions;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Purchases;

namespace Toliso.Backend.UnitTests.Purchases;

public class PurchaseOccurrenceGeneratorTests
{
    [Fact]
    public void Compra_unica_gera_uma_unica_ocorrencia_com_o_valor_cheio()
    {
        var purchase = NewPurchase(PurchaseKind.Single, totalAmount: 200m);

        var occurrences = PurchaseOccurrenceGenerator.GenerateInitial(purchase);

        occurrences.Should().ContainSingle();
        occurrences[0].Amount.Should().Be(200m);
        occurrences[0].DueDate.Should().Be(purchase.PurchaseDate);
    }

    [Fact]
    public void Parcelada_gera_uma_ocorrencia_por_mes_cuja_soma_bate_com_o_total()
    {
        var purchase = NewPurchase(PurchaseKind.Installment, totalAmount: 100m, totalInstallments: 3);

        var occurrences = PurchaseOccurrenceGenerator.GenerateInitial(purchase);

        occurrences.Should().HaveCount(3);
        occurrences.Sum(o => o.Amount).Should().Be(100m);
        occurrences.Select(o => o.DueDate).Should().BeEquivalentTo(
        [
            purchase.PurchaseDate,
            purchase.PurchaseDate.AddMonths(1),
            purchase.PurchaseDate.AddMonths(2),
        ]);
    }

    [Fact]
    public void Recorrente_gera_so_o_horizonte_rolante_a_frente_nao_um_numero_fixo()
    {
        var purchase = NewPurchase(PurchaseKind.Recurring, totalAmount: 50m, recurringIntervalMonths: 1);

        var occurrences = PurchaseOccurrenceGenerator.GenerateInitial(purchase);

        occurrences.Should().HaveCount(PurchaseOccurrenceGenerator.RecurringHorizonMonths);
        occurrences.Should().OnlyContain(o => o.Amount == 50m);
    }

    [Fact]
    public void TopUp_nao_gera_nada_se_o_horizonte_ainda_nao_esta_acabando()
    {
        var purchase = NewPurchase(PurchaseKind.Recurring, totalAmount: 50m, recurringIntervalMonths: 1);
        var today = purchase.PurchaseDate;
        var lastDueDate = today.AddMonths(PurchaseOccurrenceGenerator.RecurringHorizonMonths - 1);

        var topUp = PurchaseOccurrenceGenerator.TopUp(purchase, lastOccurrenceNumber: 3, lastDueDate, today);

        topUp.Should().BeEmpty();
    }

    [Fact]
    public void TopUp_estende_o_horizonte_quando_a_ultima_ocorrencia_esta_perto_do_limite()
    {
        var purchase = NewPurchase(PurchaseKind.Recurring, totalAmount: 50m, recurringIntervalMonths: 1);
        var today = purchase.PurchaseDate;
        var lastDueDate = today; // ja no limite — faltando as 3 seguintes

        var topUp = PurchaseOccurrenceGenerator.TopUp(purchase, lastOccurrenceNumber: 1, lastDueDate, today);

        topUp.Should().NotBeEmpty();
        topUp.Select(o => o.OccurrenceNumber).Should().BeInAscendingOrder();
        topUp[0].OccurrenceNumber.Should().Be(2);
    }

    [Fact]
    public void Recorrente_respeita_a_data_de_termino()
    {
        var purchase = NewPurchase(PurchaseKind.Recurring, totalAmount: 50m, recurringIntervalMonths: 1);
        purchase.RecurringEndsAt = purchase.PurchaseDate.AddMonths(1);

        var occurrences = PurchaseOccurrenceGenerator.GenerateInitial(purchase);

        occurrences.Should().HaveCount(2);
    }

    private static Purchase NewPurchase(
        PurchaseKind kind,
        decimal totalAmount,
        short? totalInstallments = null,
        short? recurringIntervalMonths = null) => new()
    {
        Id = Guid.NewGuid(),
        CreatedByUserId = Guid.NewGuid(),
        CardId = Guid.NewGuid(),
        Title = "Compra de teste",
        TotalAmount = totalAmount,
        PurchaseDate = new DateOnly(2025, 1, 16),
        Kind = kind,
        TotalInstallments = totalInstallments,
        RecurringIntervalMonths = recurringIntervalMonths,
    };
}
