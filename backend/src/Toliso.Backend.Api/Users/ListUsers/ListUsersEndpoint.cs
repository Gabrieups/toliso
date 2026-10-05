using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Auth;
using Toliso.Backend.Api.Data;

namespace Toliso.Backend.Api.Users.ListUsers;

public static class ListUsersEndpoint
{
    public static void MapListUsersEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/users", Handle).RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(AppDbContext db)
    {
        var users = await db.Users.OrderBy(u => u.Name).ToListAsync();
        return Results.Ok(users.Select(UserSummary.From));
    }
}
