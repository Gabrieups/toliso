using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.Api.Purchases;

public record ShareInput(Guid UserId, decimal Amount);

/// <summary>
/// Resolve quem deve quanto de uma compra. Porta de resolveShares()
/// (apps/web/lib/operations/transactions.ts) — mas aqui o resultado vira
/// linhas de <see cref="PurchaseShare"/> com a fatia constante da pessoa, nao
/// mais linhas de Transaction duplicadas por parcela.
/// </summary>
public static class PurchaseShareResolver
{
    public static List<PurchaseShare> Resolve(
        Guid purchaseId,
        decimal totalAmount,
        Guid primaryUserId,
        bool isShared,
        PurchaseDivisionType divisionType,
        IReadOnlyCollection<Guid> sharedUserIds,
        IReadOnlyCollection<ShareInput> customShares)
    {
        if (!isShared)
        {
            return [NewShare(purchaseId, primaryUserId, totalAmount, isPrimary: true)];
        }

        return divisionType switch
        {
            PurchaseDivisionType.Custom => ResolveCustom(purchaseId, totalAmount, primaryUserId, customShares),
            _ => ResolveEqual(purchaseId, totalAmount, primaryUserId, sharedUserIds),
        };
    }

    private static List<PurchaseShare> ResolveEqual(Guid purchaseId, decimal totalAmount, Guid primaryUserId, IReadOnlyCollection<Guid> sharedUserIds)
    {
        var participants = new List<Guid> { primaryUserId };
        participants.AddRange(sharedUserIds.Where(id => id != primaryUserId));

        var baseShare = Math.Round(totalAmount / participants.Count, 2, MidpointRounding.ToZero);
        var remainder = totalAmount - (baseShare * participants.Count);

        return participants
            .Select((userId, index) => NewShare(
                purchaseId,
                userId,
                index == 0 ? baseShare + remainder : baseShare,
                isPrimary: userId == primaryUserId))
            .ToList();
    }

    private static List<PurchaseShare> ResolveCustom(Guid purchaseId, decimal totalAmount, Guid primaryUserId, IReadOnlyCollection<ShareInput> customShares)
    {
        if (customShares.Count == 0)
        {
            throw new BusinessRuleException("Divisão customizada precisa de ao menos uma pessoa.");
        }

        var sum = customShares.Sum(s => s.Amount);
        if (Math.Abs(sum - totalAmount) > 0.01m)
        {
            throw new BusinessRuleException($"A soma das partes customizadas ({sum:F2}) não bate com o valor total ({totalAmount:F2}).");
        }

        return customShares
            .Select(s => NewShare(purchaseId, s.UserId, s.Amount, isPrimary: s.UserId == primaryUserId))
            .ToList();
    }

    private static PurchaseShare NewShare(Guid purchaseId, Guid userId, decimal amount, bool isPrimary)
    {
        var now = DateTimeOffset.UtcNow;
        return new PurchaseShare
        {
            Id = Guid.CreateVersion7(),
            PurchaseId = purchaseId,
            UserId = userId,
            ShareAmount = amount,
            IsPrimary = isPrimary,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }
}
