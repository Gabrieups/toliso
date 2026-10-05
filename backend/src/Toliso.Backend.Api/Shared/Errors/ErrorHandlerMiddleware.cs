using System.Net;
using Microsoft.AspNetCore.Diagnostics;
using Npgsql;

namespace Toliso.Backend.Api.Shared.Errors;

/// <summary>Traduz excecoes conhecidas pro envelope de erro padrao da API; qualquer outra vira 500 sem vazar detalhe (so a mensagem em Development).</summary>
public class ErrorHandlerMiddleware(ILogger<ErrorHandlerMiddleware> logger, IHostEnvironment environment) : IExceptionHandler
{
    private const string PostgresUniqueViolation = "23505";

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, message) = Map(exception);

        if (status == (int)HttpStatusCode.InternalServerError)
        {
            logger.LogError(exception, "Erro nao tratado em {Path}", httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = status;
        var body = environment.IsDevelopment() && status == (int)HttpStatusCode.InternalServerError
            ? new { error = message, exception = (string?)exception.ToString() }
            : new { error = message, exception = (string?)null };

        await httpContext.Response.WriteAsJsonAsync(body, cancellationToken);
        return true;
    }

    private static (int Status, string Message) Map(Exception exception) => exception switch
    {
        NotFoundException e => ((int)HttpStatusCode.NotFound, e.Message),
        ConflictException e => ((int)HttpStatusCode.Conflict, e.Message),
        ForbiddenException e => ((int)HttpStatusCode.Forbidden, e.Message),
        BusinessRuleException e => (422, e.Message),
        ExternalServiceException e => (502, e.Message),
        PostgresException { SqlState: PostgresUniqueViolation } => ((int)HttpStatusCode.Conflict, "Registro duplicado."),
        _ => ((int)HttpStatusCode.InternalServerError, "Erro interno do servidor."),
    };
}
