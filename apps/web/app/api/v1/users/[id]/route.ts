import { apiError, authenticateAdmin, handleOptions, json, readJson } from "@/lib/api-auth"
import { deleteUser, updateUser } from "@/lib/operations/admin"
import { OperationError } from "@/lib/operations/transactions"
import type { UserPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/v1/users/:id — atualiza um usuário (somente admin). */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const payload = await readJson<UserPayload>(request)
  if (!payload) return apiError("Corpo da requisição inválido")

  try {
    await updateUser(id, payload)
    return json({ success: true })
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao atualizar usuário:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

/** DELETE /api/v1/users/:id — remove um usuário (somente admin). */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params

  try {
    await deleteUser(auth.user, id)
    return json({ success: true })
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao excluir usuário:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
