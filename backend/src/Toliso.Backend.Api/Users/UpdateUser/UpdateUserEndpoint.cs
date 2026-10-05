using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Users.UpdateUser;

public record UpdateUserRequest(string Name, string Email, UserRole Role, EntityStatus Status);

public static class UpdateUserEndpoint
{
    public static void MapUpdateUserEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPut("/v1/users/{id:guid}", Handle)
            .AddEndpointFilter<ValidationFilter<UpdateUserRequest>>()
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(Guid id, UpdateUserRequest request, AppDbContext db)
    {
        var user = await db.Users.FindAsync(id) ?? throw new NotFoundException("Usuário não encontrado.");

        user.Name = request.Name;
        user.Email = request.Email;
        user.Role = request.Role;
        user.Status = request.Status;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
