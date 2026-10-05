using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Notifications;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Entries.CreateEntry;

public record CreateEntryRequest(string Title, string? Description, decimal Amount, Guid? TargetUserId);

public record EntryResponse(Guid Id, Guid UserId, string Title, decimal Amount, DateOnly EntryDate);

public static class CreateEntryEndpoint
{
    public static void MapCreateEntryEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/entries", Handle)
            .AddEndpointFilter<ValidationFilter<CreateEntryRequest>>()
            .RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(CreateEntryRequest request, ClaimsPrincipal principal, AppDbContext db, IPushSender pushSender)
    {
        var currentUserId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var isAdmin = principal.IsInRole("Admin");

        var ownerId = currentUserId;
        if (isAdmin && request.TargetUserId is { } targetId && targetId != currentUserId)
        {
            var targetExists = await db.Users.AnyAsync(u => u.Id == targetId);
            if (targetExists)
            {
                ownerId = targetId;
            }
        }

        var now = DateTimeOffset.UtcNow;
        var entry = new Entry
        {
            Id = Guid.CreateVersion7(),
            UserId = ownerId,
            CreatedByUserId = currentUserId,
            Title = request.Title,
            Description = request.Description,
            Amount = request.Amount,
            EntryDate = DateOnly.FromDateTime(now.UtcDateTime),
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Entries.Add(entry);
        await db.SaveChangesAsync();

        if (ownerId != currentUserId)
        {
            await pushSender.SendAsync([ownerId], "Pagamento registrado", $"\"{entry.Title}\" ({entry.Amount:C}) foi registrado para você.");
        }

        return Results.Created($"/v1/entries/{entry.Id}", new EntryResponse(entry.Id, entry.UserId, entry.Title, entry.Amount, entry.EntryDate));
    }
}
