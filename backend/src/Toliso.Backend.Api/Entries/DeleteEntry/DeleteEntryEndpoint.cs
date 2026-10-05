using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.Api.Entries.DeleteEntry;

public static class DeleteEntryEndpoint
{
    public static void MapDeleteEntryEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapDelete("/v1/entries/{id:guid}", Handle).RequireAuthorization("ActiveUser");
    }

    private static async Task<IResult> Handle(Guid id, AppDbContext db)
    {
        var entry = await db.Entries.FindAsync(id) ?? throw new NotFoundException("Pagamento não encontrado.");
        db.Entries.Remove(entry);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
