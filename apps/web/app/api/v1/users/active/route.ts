import { apiError, authenticate, handleOptions, json } from "@/lib/api-auth"
import { listActiveUsers } from "@/lib/operations/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/v1/users/active — usuários ativos, usados para dividir despesas.
 * Disponível para qualquer usuário autenticado (sem dados sensíveis).
 */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  try {
    const users = await listActiveUsers()
    return json({ success: true, users })
  } catch (error) {
    console.error("[api] erro ao listar usuários ativos:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
