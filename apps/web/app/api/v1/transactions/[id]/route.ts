import { apiError, authenticate, authenticateAdmin, handleOptions, json, readJson } from "@/lib/api-auth"
import { OperationError, deleteTransaction, editTransaction } from "@/lib/operations/transactions"
import type { UpdateTransactionPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/v1/transactions/:id — edição de despesa (somente admin). */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const payload = await readJson<UpdateTransactionPayload>(request)
  if (!payload) return apiError("Corpo da requisição inválido")

  try {
    const result = await editTransaction(id, payload)
    return json({ success: true, message: result.message })
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao editar transação:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

/** DELETE /api/v1/transactions/:id — remove a despesa e seu grupo. */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params

  try {
    await deleteTransaction(id)
    return json({ success: true })
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao excluir transação:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
