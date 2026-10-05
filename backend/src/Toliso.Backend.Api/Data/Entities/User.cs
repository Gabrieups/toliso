namespace Toliso.Backend.Api.Data.Entities;

public class User
{
    public Guid Id { get; init; }
    public required string Email { get; set; }
    public required string Name { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public EntityStatus Status { get; set; } = EntityStatus.Active;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; set; }
}
