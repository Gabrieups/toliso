namespace Toliso.Backend.Api.Shared.Notifications;

/// <summary>
/// Porta de envio de push (Expo). Nesta primeira fase (so a API, sem infra de
/// envio real) a implementacao registrada e <see cref="LoggingPushSender"/>,
/// que so loga — trocar por uma implementacao que chama o Expo Push Service e
/// um `services.AddScoped&lt;IPushSender, ExpoPushSender&gt;()` depois.
/// </summary>
public interface IPushSender
{
    Task SendAsync(IEnumerable<Guid> userIds, string title, string body, CancellationToken cancellationToken = default);
}

public class LoggingPushSender(ILogger<LoggingPushSender> logger) : IPushSender
{
    public Task SendAsync(IEnumerable<Guid> userIds, string title, string body, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "[push stub] para {UserIds}: {Title} — {Body}",
            string.Join(",", userIds),
            title,
            body);
        return Task.CompletedTask;
    }
}
