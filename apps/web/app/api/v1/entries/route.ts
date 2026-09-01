import { apiError, authenticate, handleOptions, json, readJson } from "@/lib/api-auth"
import { createEntry, listEntries } from "@/lib/operations/entries"
import { OperationError } from "@/lib/operations/transactions"
import type { CreateEntryPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/v1/entries — pagamentos visíveis ao usuário autenticado. */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  try {
    const entries = await listEntries(auth.user)
    return json({ success: true, entries })
  } catch (error) {
    console.error("[api] erro ao listar pagamentos:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

/** POST /api/v1/entries — registra um pagamento. */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const payload = await readJson<CreateEntryPayload>(request)
  if (!payload) return apiError("Corpo da requisição inválido")

  try {
    const entry = await createEntry(auth.user, payload)
    return json({ success: true, entry }, 201)
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao criar pagamento:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
