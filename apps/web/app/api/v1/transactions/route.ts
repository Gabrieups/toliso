import { apiError, authenticate, handleOptions, json, readJson } from "@/lib/api-auth"
import { OperationError, createTransaction, listTransactions } from "@/lib/operations/transactions"
import type { CreateTransactionPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/v1/transactions — despesas visíveis ao usuário autenticado. */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  try {
    const transactions = await listTransactions(auth.user)
    return json({ success: true, transactions })
  } catch (error) {
    console.error("[api] erro ao listar transações:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

/** POST /api/v1/transactions — cria uma despesa (parcelada/dividida/recorrente). */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const payload = await readJson<CreateTransactionPayload>(request)
  if (!payload) return apiError("Corpo da requisição inválido")

  try {
    const result = await createTransaction(auth.user, payload)
    return json({ success: true, transactions: result.transactions, message: result.message }, 201)
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao criar transação:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
