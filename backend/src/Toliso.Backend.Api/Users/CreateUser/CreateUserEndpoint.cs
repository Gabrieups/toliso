using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Auth;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;
using Toliso.Backend.Api.Shared.Validation;

namespace Toliso.Backend.Api.Users.CreateUser;

public record CreateUserRequest(string Name, string Email, string Password, UserRole Role = UserRole.User, EntityStatus Status = EntityStatus.Active);

public static class CreateUserEndpoint
{
    public static void MapCreateUserEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapPost("/v1/users", Handle)
            .AddEndpointFilter<ValidationFilter<CreateUserRequest>>()
            .RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(CreateUserRequest request, AppDbContext db)
    {
        var emailInUse = await db.Users.AnyAsync(u => u.Email == request.Email);
        if (emailInUse)
        {
            throw new ConflictException("Email já está em uso.");
        }

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.CreateVersion7(),
            Name = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            Status = request.Status,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Results.Created($"/v1/users/{user.Id}", UserSummary.From(user));
    }
}
