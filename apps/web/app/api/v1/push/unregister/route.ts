import { pushTokenService } from "@/lib/dynamodb"
import { apiError, authenticate, handleOptions, json, readJson } from "@/lib/api-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/v1/push/unregister — remove o token do aparelho.
 * Chamado no logout para que o dispositivo pare de receber notificações.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const payload = await readJson<{ token?: string }>(request)

  if (!payload?.token) {
    return apiError("Token de notificação é obrigatório")
  }

  try {
    await pushTokenService.delete(payload.token)
    return json({ success: true })
  } catch (error) {
    console.warn("[api] não foi possível remover o token de push:", error)
    return json({ success: true })
  }
}

export function OPTIONS() {
  return handleOptions()
}
