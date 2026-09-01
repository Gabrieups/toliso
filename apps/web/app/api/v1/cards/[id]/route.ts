import { apiError, authenticateAdmin, handleOptions, json, readJson } from "@/lib/api-auth"
import { deleteCard, updateCard } from "@/lib/operations/admin"
import { OperationError } from "@/lib/operations/transactions"
import type { CardPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/v1/cards/:id — atualiza um cartão (somente admin). */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const payload = await readJson<CardPayload>(request)
  if (!payload) return apiError("Corpo da requisição inválido")

  try {
    await updateCard(id, payload)
    return json({ success: true })
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao atualizar cartão:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

/** DELETE /api/v1/cards/:id — remove um cartão (somente admin). */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params

  try {
    await deleteCard(id)
    return json({ success: true })
  } catch (error) {
    console.error("[api] erro ao excluir cartão:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
