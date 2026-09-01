import { authenticate, handleOptions, json } from "@/lib/api-auth"
import { sendPushToUsers } from "@/lib/push"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/v1/push/test — dispara uma notificação para o próprio usuário.
 * Usado pela tela de Ajustes do aplicativo para validar a configuração.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const delivered = await sendPushToUsers([auth.user.id], {
    title: "Notificações ativas",
    body: `Tudo certo, ${auth.user.name.split(" ")[0]}! Você vai receber avisos de despesas e faturas por aqui.`,
    data: { kind: "test", screen: "/(tabs)/home" },
  })

  return json({ success: true, delivered })
}

export function OPTIONS() {
  return handleOptions()
}
