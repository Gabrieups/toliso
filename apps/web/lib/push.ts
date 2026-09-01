import { pushTokenService } from "@/lib/dynamodb"
import type { NotificationContent } from "@toliso/core"

/**
 * Envio de notificações push via Expo Push Service.
 *
 * Tudo aqui é "best effort": se a tabela `pushTokensTL` ainda não existe, se o
 * usuário nunca abriu o aplicativo ou se o serviço da Expo estiver fora do ar,
 * a operação de negócio que disparou a notificação NÃO deve falhar.
 */

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound: "default"
  channelId: string
  priority: "high"
}

/** Envia uma notificação para todos os dispositivos dos usuários informados. */
export async function sendPushToUsers(userIds: string[], content: NotificationContent): Promise<number> {
  const targets = userIds.filter(Boolean)
  if (targets.length === 0) return 0

  let tokens: Awaited<ReturnType<typeof pushTokenService.getByUserIds>> = []

  try {
    tokens = await pushTokenService.getByUserIds(targets)
  } catch (error) {
    console.warn("[push] não foi possível ler os tokens registrados:", error)
    return 0
  }

  return sendPushToTokens(
    tokens.map((item) => item.token),
    content,
  )
}

/** Envia uma notificação para uma lista explícita de tokens do Expo. */
export async function sendPushToTokens(tokens: string[], content: NotificationContent): Promise<number> {
  const valid = Array.from(new Set(tokens.filter((token) => token?.startsWith("ExponentPushToken"))))
  if (valid.length === 0) return 0

  const messages: ExpoPushMessage[] = valid.map((token) => ({
    to: token,
    title: content.title,
    body: content.body,
    data: content.data,
    sound: "default",
    channelId: "default",
    priority: "high",
  }))

  // A Expo aceita no máximo 100 mensagens por requisição.
  const chunks: ExpoPushMessage[][] = []
  for (let index = 0; index < messages.length; index += 100) {
    chunks.push(messages.slice(index, index + 100))
  }

  let delivered = 0

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk),
      })

      if (!response.ok) {
        console.warn("[push] Expo respondeu", response.status, await response.text())
        continue
      }

      const result = (await response.json()) as { data?: Array<{ status: string; details?: { error?: string } }> }

      result.data?.forEach((ticket, index) => {
        if (ticket.status === "ok") {
          delivered += 1
          return
        }

        // Token revogado (app desinstalado): limpa o registro para não insistir.
        if (ticket.details?.error === "DeviceNotRegistered") {
          const token = chunk[index]?.to
          if (token) {
            pushTokenService.delete(token).catch(() => undefined)
          }
        }
      })
    } catch (error) {
      console.warn("[push] falha ao enviar notificações:", error)
    }
  }

  return delivered
}

/** Executa o envio sem bloquear o fluxo principal nem propagar erros. */
export function sendPushInBackground(userIds: string[], content: NotificationContent): void {
  sendPushToUsers(userIds, content).catch((error) => {
    console.warn("[push] envio em segundo plano falhou:", error)
  })
}
