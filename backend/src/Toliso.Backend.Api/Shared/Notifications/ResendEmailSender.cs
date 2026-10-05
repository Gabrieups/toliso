using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Toliso.Backend.Api.Shared.Errors;

namespace Toliso.Backend.Api.Shared.Notifications;

public class ResendOptions
{
    public const string SectionName = "Resend";

    public string? ApiKey { get; init; }
    public string FromEmail { get; init; } = "onboarding@resend.dev";
}

/// <summary>
/// Envia e-mail de verdade via Resend — porta de apps/web/lib/email.ts.
/// Ao contrario do push, uma falha aqui deve aparecer pro admin que pediu o
/// relatorio (nao e best-effort): sem API key configurada ou com a Resend
/// fora do ar, o endpoint que chamou isso responde 502.
/// </summary>
public class ResendEmailSender(HttpClient httpClient, IOptions<ResendOptions> options) : IReportEmailSender
{
    private const string SendEndpoint = "https://api.resend.com/emails";

    public async Task SendAsync(string toEmail, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        var apiKey = options.Value.ApiKey;
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new ExternalServiceException("Envio de e-mail não configurado (Resend:ApiKey ausente).");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, SendEndpoint)
        {
            Content = JsonContent.Create(new ResendEmailRequest(options.Value.FromEmail, [toEmail], subject, bodyHtml)),
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ExternalServiceException($"Erro ao enviar email ({response.StatusCode}): {body}");
        }
    }

    private record ResendEmailRequest(
        [property: JsonPropertyName("from")] string From,
        [property: JsonPropertyName("to")] List<string> To,
        [property: JsonPropertyName("subject")] string Subject,
        [property: JsonPropertyName("html")] string Html);
}
