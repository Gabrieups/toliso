using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Push.RegisterPushToken;

public record RegisterPushTokenRequest(string Token, PushPlatform Platform = PushPlatform.Android, string? DeviceName = null);

/// <summary>Associa (ou reassocia) o token de push do Expo ao usuario autenticado. Idempotente — a chave e o proprio token.</summary>
public static class RegisterPushTokenEndpoint
{
    public static void MapRegisterPushTokenEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/push/register", Handle)
            .AddEndpointFilter<ValidationFilter<RegisterPushTokenRequest>>()
            .RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(RegisterPushTokenRequest request, ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var now = DateTimeOffset.UtcNow;

        var existing = await db.PushTokens.FindAsync(request.Token);
        if (existing is null)
        {
            db.PushTokens.Add(new Data.Entities.PushToken
            {
                Token = request.Token,
                UserId = userId,
                Platform = request.Platform,
                DeviceName = request.DeviceName,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            existing.UserId = userId;
            existing.Platform = request.Platform;
            existing.DeviceName = request.DeviceName;
            existing.UpdatedAt = now;
        }

        await db.SaveChangesAsync();
        return Results.Ok();
    }
}
