using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Auth;

/// <summary>Projecao de usuario sem a senha — devolvida por qualquer endpoint que exponha dados de usuario.</summary>
public record UserSummary(Guid Id, string Email, string Name, UserRole Role, EntityStatus Status)
{
    public static UserSummary From(User user) => new(user.Id, user.Email, user.Name, user.Role, user.Status);
}
