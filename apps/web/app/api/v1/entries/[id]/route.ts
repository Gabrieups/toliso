import { apiError, authenticate, handleOptions, json } from "@/lib/api-auth"
import { deleteEntry } from "@/lib/operations/entries"
import { OperationError } from "@/lib/operations/transactions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

/** DELETE /api/v1/entries/:id — exclui um pagamento. */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const { id } = await context.params

  try {
    await deleteEntry(id)
    return json({ success: true })
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao excluir pagamento:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
