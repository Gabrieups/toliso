using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Auth;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Users.ListActiveUsers;

/// <summary>Usuarios ativos — usado pra escolher com quem dividir uma compra. Disponivel pra qualquer usuario autenticado.</summary>
public static class ListActiveUsersEndpoint
{
    public static void MapListActiveUsersEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/users/active", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(AppDbContext db)
    {
        var users = await db.Users.Where(u => u.Status == EntityStatus.Active).OrderBy(u => u.Name).ToListAsync();
        return Results.Ok(users.Select(UserSummary.From));
    }
}
