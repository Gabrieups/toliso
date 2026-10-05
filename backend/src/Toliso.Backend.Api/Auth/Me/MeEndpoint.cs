using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.Api.Auth.Me;

public static class MeEndpoint
{
    public static void MapMeEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/auth/me", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Usuário não encontrado.");
        return Results.Ok(UserSummary.From(user));
    }
}
