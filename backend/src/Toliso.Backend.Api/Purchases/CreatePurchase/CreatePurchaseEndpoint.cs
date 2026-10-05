using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Notifications;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Purchases.CreatePurchase;

public record CustomShareInput(Guid UserId, decimal Amount);

public record CreatePurchaseRequest(
    string Title,
    string? Description,
    decimal Amount,
    Guid CardId,
    short Installments = 1,
    bool IsShared = false,
    bool IsRecurring = false,
    PurchaseDivisionType DivisionType = PurchaseDivisionType.Equal,
    List<Guid>? SharedUserIds = null,
    List<CustomShareInput>? CustomShares = null,
    Guid? TargetUserId = null,
    DateOnly? Date = null);

public record PurchaseResponse(Guid Id, string Title, decimal TotalAmount, Guid CardId, PurchaseKind Kind, DateOnly PurchaseDate);

public static class CreatePurchaseEndpoint
{
    public static void MapCreatePurchaseEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/purchases", Handle)
            .AddEndpointFilter<ValidationFilter<CreatePurchaseRequest>>()
            .RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(CreatePurchaseRequest request, ClaimsPrincipal principal, AppDbContext db, IPushSender pushSender)
    {
        var currentUserId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var isAdmin = principal.IsInRole("Admin");

        var cardExists = await db.CreditCards.AnyAsync(c => c.Id == request.CardId);
        if (!cardExists)
        {
            throw new NotFoundException("Cartão não encontrado.");
        }

        var primaryUserId = currentUserId;
        if (isAdmin && request.TargetUserId is { } targetId && targetId != currentUserId)
        {
            var targetExists = await db.Users.AnyAsync(u => u.Id == targetId);
            if (targetExists)
            {
                primaryUserId = targetId;
            }
        }

        var kind = request.Installments > 1
            ? PurchaseKind.Installment
            : request.IsRecurring ? PurchaseKind.Recurring : PurchaseKind.Single;

        var now = DateTimeOffset.UtcNow;
        var purchase = new Purchase
        {
            Id = Guid.CreateVersion7(),
            CreatedByUserId = currentUserId,
            CardId = request.CardId,
            Title = request.Title,
            Description = request.Description,
            TotalAmount = request.Amount,
            PurchaseDate = request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow),
            DivisionType = request.DivisionType,
            Kind = kind,
            TotalInstallments = kind == PurchaseKind.Installment ? request.Installments : null,
            RecurringIntervalMonths = kind == PurchaseKind.Recurring ? (short)1 : null,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var shares = PurchaseShareResolver.Resolve(
            purchase.Id,
            request.Amount,
            primaryUserId,
            request.IsShared,
            request.DivisionType,
            request.SharedUserIds ?? [],
            (request.CustomShares ?? []).Select(c => new ShareInput(c.UserId, c.Amount)).ToList());

        var occurrences = PurchaseOccurrenceGenerator.GenerateInitial(purchase);

        db.Purchases.Add(purchase);
        db.PurchaseShares.AddRange(shares);
        db.PurchaseOccurrences.AddRange(occurrences);
        await db.SaveChangesAsync();

        await NotifySharesAsync(pushSender, shares, currentUserId, primaryUserId, purchase);

        return Results.Created(
            $"/v1/purchases/{purchase.Id}",
            new PurchaseResponse(purchase.Id, purchase.Title, purchase.TotalAmount, purchase.CardId, purchase.Kind, purchase.PurchaseDate));
    }

    private static Task NotifySharesAsync(
        IPushSender pushSender,
        List<Data.Entities.PurchaseShare> shares,
        Guid authorId,
        Guid primaryUserId,
        Purchase purchase)
    {
        var othersToNotify = shares.Select(s => s.UserId).Where(id => id != authorId).ToList();
        if (othersToNotify.Count == 0)
        {
            return Task.CompletedTask;
        }

        var body = primaryUserId != authorId
            ? $"Uma despesa foi registrada na sua conta: \"{purchase.Title}\" ({purchase.TotalAmount:C})."
            : $"Uma despesa foi dividida com você: \"{purchase.Title}\" ({purchase.TotalAmount:C}).";

        return pushSender.SendAsync(othersToNotify, "Nova despesa", body);
    }
}
