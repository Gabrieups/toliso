namespace Toliso.Backend.Api.Shared.Notifications;

/// <summary>
/// Porta de envio do relatorio de gastos por e-mail. Nesta primeira fase a
/// implementacao registrada e <see cref="LoggingReportEmailSender"/>, que so
/// loga — trocar por uma implementacao que chama o Resend depois.
/// </summary>
public interface IReportEmailSender
{
    Task SendAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default);
}

public class LoggingReportEmailSender(ILogger<LoggingReportEmailSender> logger) : IReportEmailSender
{
    public Task SendAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("[report stub] para {Email}: {Subject}", toEmail, subject);
        return Task.CompletedTask;
    }
}
