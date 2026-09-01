import { pushTokenService } from "@/lib/dynamodb"
import { apiError, authenticate, handleOptions, json, readJson } from "@/lib/api-auth"
import type { RegisterPushPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/v1/push/register — associa o token de push do aparelho ao usuário.
 *
 * O registro é idempotente: a chave da tabela é o próprio token, então reabrir o
 * app apenas atualiza o dono e o `updatedAt`.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const payload = await readJson<RegisterPushPayload>(request)

  if (!payload?.token) {
    return apiError("Token de notificação é obrigatório")
  }

  try {
    await pushTokenService.register({
      token: payload.token,
      userId: auth.user.id,
      userEmail: auth.user.email,
      platform: payload.platform ?? "android",
      deviceName: payload.deviceName,
    })

    return json({ success: true })
  } catch (error) {
    // A ausência da tabela não deve impedir o uso do aplicativo.
    console.warn("[api] não foi possível registrar o token de push:", error)
    return json({ success: true, warning: "Notificações push indisponíveis no servidor" })
  }
}

export function OPTIONS() {
  return handleOptions()
}
