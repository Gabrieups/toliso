using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Toliso.Backend.Api.Data;

namespace Toliso.Backend.Api.Shared.Notifications;

public class ExpoOptions
{
    public const string SectionName = "Expo";

    /// <summary>Opcional — so necessario se o projeto Expo exigir autenticacao no envio.</summary>
    public string? AccessToken { get; init; }
}

/// <summary>
/// Envia push de verdade via Expo Push Service — porta de
/// apps/web/lib/push.ts. Best-effort de proposito: se a Expo estiver fora do
/// ar ou o usuario nunca tiver aberto o app (sem token registrado), a
/// operacao de negocio que disparou a notificacao nao pode falhar por causa
/// disso.
/// </summary>
public class ExpoPushSender(HttpClient httpClient, AppDbContext db, IOptions<ExpoOptions> options, ILogger<ExpoPushSender> logger)
    : IPushSender
{
    private const string PushEndpoint = "https://exp.host/--/api/v2/push/send";
    private const int MaxMessagesPerRequest = 100;

    public async Task SendAsync(IEnumerable<Guid> userIds, string title, string body, CancellationToken cancellationToken = default)
    {
        var targets = userIds.Distinct().ToList();
        if (targets.Count == 0)
        {
            return;
        }

        List<string> tokens;
        try
        {
            tokens = await db.PushTokens.Where(p => targets.Contains(p.UserId)).Select(p => p.Token).ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[push] não foi possível ler os tokens registrados");
            return;
        }

        var validTokens = tokens.Where(t => t.StartsWith("ExponentPushToken", StringComparison.Ordinal)).Distinct().ToList();
        if (validTokens.Count == 0)
        {
            return;
        }

        var messages = validTokens.Select(token => new ExpoPushMessage(token, title, body)).ToList();

        foreach (var chunk in messages.Chunk(MaxMessagesPerRequest))
        {
            await SendChunkAsync(chunk, cancellationToken);
        }
    }

    private async Task SendChunkAsync(ExpoPushMessage[] chunk, CancellationToken cancellationToken)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, PushEndpoint)
            {
                Content = JsonContent.Create(chunk),
            };
            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
            if (!string.IsNullOrEmpty(options.Value.AccessToken))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", options.Value.AccessToken);
            }

            var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("[push] Expo respondeu {Status}: {Body}", response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
                return;
            }

            var result = await response.Content.ReadFromJsonAsync<ExpoPushResponse>(cancellationToken);
            await HandleTicketsAsync(chunk, result, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[push] falha ao enviar notificações");
        }
    }

    private async Task HandleTicketsAsync(ExpoPushMessage[] chunk, ExpoPushResponse? result, CancellationToken cancellationToken)
    {
        if (result?.Data is null)
        {
            return;
        }

        for (var i = 0; i < result.Data.Count && i < chunk.Length; i++)
        {
            var ticket = result.Data[i];
            if (ticket.Status == "ok" || ticket.Details?.Error != "DeviceNotRegistered")
            {
                continue;
            }

            // Token revogado (app desinstalado): apaga o registro pra nao insistir.
            var token = await db.PushTokens.FindAsync([chunk[i].To], cancellationToken);
            if (token is not null)
            {
                db.PushTokens.Remove(token);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private record ExpoPushMessage(string To, string Title, string Body)
    {
        [JsonPropertyName("sound")]
        public string Sound => "default";

        [JsonPropertyName("channelId")]
        public string ChannelId => "default";

        [JsonPropertyName("priority")]
        public string Priority => "high";
    }

    private record ExpoPushResponse([property: JsonPropertyName("data")] List<ExpoPushTicket>? Data);

    private record ExpoPushTicket(
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("details")] ExpoPushTicketDetails? Details);

    private record ExpoPushTicketDetails([property: JsonPropertyName("error")] string? Error);
}
