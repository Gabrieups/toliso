using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;

namespace Toliso.Backend.Api.Shared.Auth;

/// <summary>
/// Exige que o token seja valido E que o usuario continue "active" no banco
/// agora — replica o <c>authenticate()</c> de hoje, que reconsulta o status a
/// cada requisicao (um JWT sozinho nao reflete o usuario ter sido desativado
/// no meio da validade do token).
/// </summary>
public sealed class ActiveUserRequirement : IAuthorizationRequirement;

public class ActiveUserHandler(AppDbContext dbContext) : AuthorizationHandler<ActiveUserRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ActiveUserRequirement requirement)
    {
        var subject = context.User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        if (subject is null || !Guid.TryParse(subject, out var userId))
        {
            return;
        }

        var status = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => (EntityStatus?)u.Status)
            .FirstOrDefaultAsync();

        if (status == EntityStatus.Active)
        {
            context.Succeed(requirement);
        }
    }
}
