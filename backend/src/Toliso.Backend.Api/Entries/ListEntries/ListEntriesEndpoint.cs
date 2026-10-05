using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Entries.CreateEntry;

namespace Toliso.Backend.Api.Entries.ListEntries;

/// <summary>Admin ve todos os pagamentos; demais usuarios veem so os proprios.</summary>
public static class ListEntriesEndpoint
{
    public static void MapListEntriesEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/v1/entries", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(ClaimsPrincipal principal, AppDbContext db)
    {
        var userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        var isAdmin = principal.IsInRole("Admin");

        var query = db.Entries.AsQueryable();
        if (!isAdmin)
        {
            query = query.Where(e => e.UserId == userId);
        }

        var entries = await query.OrderByDescending(e => e.EntryDate).ToListAsync();
        return Results.Ok(entries.Select(e => new EntryResponse(e.Id, e.UserId, e.Title, e.Amount, e.EntryDate)));
    }
}
