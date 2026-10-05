using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Auth;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Auth.Login;

public record LoginRequest(string Email, string Password);

public record LoginResponse(string Token, DateTimeOffset ExpiresAt, UserSummary User);

public static class LoginEndpoint
{
    public static void MapLoginEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/auth/login", Handle)
            .AddEndpointFilter<ValidationFilter<LoginRequest>>()
            .AllowAnonymous();
    }

    private static async Task<IResult> Handle(LoginRequest request, AppDbContext db, IJwtTokenService tokenService)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Results.Unauthorized();
        }

        if (user.Status != EntityStatus.Active)
        {
            return Results.Json(new { error = "Usuário inativo. Entre em contato com o administrador." }, statusCode: 403);
        }

        var (token, expiresAt) = tokenService.CreateToken(user);
        return Results.Ok(new LoginResponse(token, expiresAt, UserSummary.From(user)));
    }
}
