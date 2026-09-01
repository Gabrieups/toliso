import { apiError, authenticate, handleOptions, json } from "@/lib/api-auth"
import { listCards } from "@/lib/operations/admin"
import { listEntries } from "@/lib/operations/entries"
import { listTransactions } from "@/lib/operations/transactions"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/v1/summary — carga inicial do aplicativo em uma única requisição.
 *
 * O mobile roda em rede móvel, onde cada round-trip custa caro; agrupar
 * transações, pagamentos e cartões aqui deixa a abertura do app bem mais rápida
 * do que três chamadas separadas.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  try {
    const [transactions, entries, cards] = await Promise.all([
      listTransactions(auth.user),
      listEntries(auth.user),
      listCards(),
    ])

    return json({
      success: true,
      user: auth.user,
      transactions,
      entries,
      cards,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[api] erro ao montar resumo:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
