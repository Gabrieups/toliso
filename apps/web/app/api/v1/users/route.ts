import { apiError, authenticateAdmin, handleOptions, json, readJson } from "@/lib/api-auth"
import { createUser, listUsers, toPublicUser } from "@/lib/operations/admin"
import { OperationError } from "@/lib/operations/transactions"
import type { UserPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/v1/users — lista de usuários sem dados sensíveis (somente admin). */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const users = await listUsers()
    return json({ success: true, users })
  } catch (error) {
    console.error("[api] erro ao listar usuários:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

/** POST /api/v1/users — cria um usuário (somente admin). */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const payload = await readJson<UserPayload>(request)
  if (!payload) return apiError("Corpo da requisição inválido")

  try {
    const user = await createUser(payload)
    return json({ success: true, user: toPublicUser(user) }, 201)
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao criar usuário:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
