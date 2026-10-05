namespace Toliso.Backend.Api.Data.Entities;

/// <summary>Token de push do Expo registrado por um dispositivo. A chave primaria e o proprio token: reinstalar o app so sobrescreve o dono.</summary>
public class PushToken
{
    public required string Token { get; init; }
    public required Guid UserId { get; set; }
    public PushPlatform Platform { get; set; }
    public string? DeviceName { get; set; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; set; }
}
