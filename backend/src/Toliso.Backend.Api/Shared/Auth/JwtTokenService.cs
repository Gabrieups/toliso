using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Shared.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public required string Secret { get; init; }
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public int ExpirationDays { get; init; } = 30;
}

public interface IJwtTokenService
{
    (string Token, DateTimeOffset ExpiresAt) CreateToken(User user);
}

/// <summary>
/// Emite o token bearer unico usado por web e mobile — substitui os dois
/// mecanismos do sistema antigo (cookie de sessao na web, HMAC custom no
/// mobile) por um so formato padrao (JWT).
/// </summary>
public class JwtTokenService(Microsoft.Extensions.Options.IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _options = options.Value;

    public (string Token, DateTimeOffset ExpiresAt) CreateToken(User user)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(_options.ExpirationDays);

        // Nomes de claim literais (nao ClaimTypes.*): o JwtBearer remapeia
        // automaticamente nomes curtos conhecidos (sub, role) pras URIs longas
        // do XML schema na leitura, e MapInboundClaims=false (Program.cs)
        // desativa isso — entao o claim tem que se chamar exatamente como foi
        // emitido aqui, ou FindFirstValue/IsInRole nao acham nada.
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.Name),
            new Claim("role", user.Role.ToString()),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
