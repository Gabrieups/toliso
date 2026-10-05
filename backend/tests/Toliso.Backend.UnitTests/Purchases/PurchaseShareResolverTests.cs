using FluentAssertions;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Purchases;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.UnitTests.Purchases;

public class PurchaseShareResolverTests
{
    [Fact]
    public void Nao_compartilhada_gera_um_unico_share_primario_com_o_valor_cheio()
    {
        var primaryUserId = Guid.NewGuid();

        var shares = PurchaseShareResolver.Resolve(
            Guid.NewGuid(), 150m, primaryUserId, isShared: false, PurchaseDivisionType.Equal, [], []);

        shares.Should().ContainSingle();
        shares[0].UserId.Should().Be(primaryUserId);
        shares[0].ShareAmount.Should().Be(150m);
        shares[0].IsPrimary.Should().BeTrue();
    }

    [Fact]
    public void Divisao_igual_soma_exatamente_o_total_mesmo_com_resto_de_centavos()
    {
        var primaryUserId = Guid.NewGuid();
        var others = new[] { Guid.NewGuid(), Guid.NewGuid() };

        // 100 / 3 pessoas nao fecha exato em centavos — o resto tem que ir pro primario.
        var shares = PurchaseShareResolver.Resolve(
            Guid.NewGuid(), 100m, primaryUserId, isShared: true, PurchaseDivisionType.Equal, others, []);

        shares.Should().HaveCount(3);
        shares.Sum(s => s.ShareAmount).Should().Be(100m);
        shares.Single(s => s.IsPrimary).UserId.Should().Be(primaryUserId);
    }

    [Fact]
    public void Divisao_customizada_usa_os_valores_informados()
    {
        var primaryUserId = Guid.NewGuid();
        var otherId = Guid.NewGuid();
        var customShares = new[] { new ShareInput(primaryUserId, 70m), new ShareInput(otherId, 30m) };

        var shares = PurchaseShareResolver.Resolve(
            Guid.NewGuid(), 100m, primaryUserId, isShared: true, PurchaseDivisionType.Custom, [], customShares);

        shares.Should().HaveCount(2);
        shares.Single(s => s.UserId == primaryUserId).ShareAmount.Should().Be(70m);
        shares.Single(s => s.UserId == otherId).ShareAmount.Should().Be(30m);
    }

    [Fact]
    public void Divisao_customizada_cuja_soma_nao_bate_com_o_total_falha()
    {
        var primaryUserId = Guid.NewGuid();
        var customShares = new[] { new ShareInput(primaryUserId, 40m), new ShareInput(Guid.NewGuid(), 40m) };

        var act = () => PurchaseShareResolver.Resolve(
            Guid.NewGuid(), 100m, primaryUserId, isShared: true, PurchaseDivisionType.Custom, [], customShares);

        act.Should().Throw<BusinessRuleException>();
    }
}
