import { apiError, authenticate, authenticateAdmin, handleOptions, json, readJson } from "@/lib/api-auth"
import { createCard, listCards } from "@/lib/operations/admin"
import { OperationError } from "@/lib/operations/transactions"
import type { CardPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/v1/cards — todos os cartões cadastrados. */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  try {
    const cards = await listCards()
    return json({ success: true, cards })
  } catch (error) {
    console.error("[api] erro ao listar cartões:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

/** POST /api/v1/cards — cria um cartão (somente admin). */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const payload = await readJson<CardPayload>(request)
  if (!payload) return apiError("Corpo da requisição inválido")

  try {
    const card = await createCard(payload)
    return json({ success: true, card }, 201)
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao criar cartão:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
