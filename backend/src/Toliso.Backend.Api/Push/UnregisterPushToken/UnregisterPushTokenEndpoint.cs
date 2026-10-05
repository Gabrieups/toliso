using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Push.UnregisterPushToken;

public record UnregisterPushTokenRequest(string Token);

/// <summary>Remove o token do aparelho — chamado no logout, pra ele parar de receber notificacoes.</summary>
public static class UnregisterPushTokenEndpoint
{
    public static void MapUnregisterPushTokenEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/push/unregister", Handle)
            .AddEndpointFilter<ValidationFilter<UnregisterPushTokenRequest>>()
            .RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(UnregisterPushTokenRequest request, AppDbContext db)
    {
        var existing = await db.PushTokens.FindAsync(request.Token);
        if (existing is not null)
        {
            db.PushTokens.Remove(existing);
            await db.SaveChangesAsync();
        }

        return Results.Ok();
    }
}
