using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Toliso.Backend.Api.Data;
using Toliso.Backend.Api.Data.Entities;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.Api.Users.DeleteUser;

/// <summary>
/// "Exclui" um usuario — na pratica desativa (status=inactive). Um delete
/// fisico esbarraria em FK RESTRICT assim que o usuario tiver qualquer compra
/// ou pagamento no historico; desativar e o comportamento previsivel em
/// qualquer caso.
/// </summary>
public static class DeleteUserEndpoint
{
    public static void MapDeleteUserEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapDelete("/v1/users/{id:guid}", Handle).RequireAuthorization("AdminOnly");
    }

    private static async Task<IResult> Handle(Guid id, ClaimsPrincipal principal, AppDbContext db)
    {
        var currentUserId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
        if (currentUserId == id)
        {
            throw new BusinessRuleException("Você não pode excluir sua própria conta.");
        }

        var user = await db.Users.FindAsync(id) ?? throw new NotFoundException("Usuário não encontrado.");
        user.Status = EntityStatus.Inactive;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();
        return Results.NoContent();
    }
}
