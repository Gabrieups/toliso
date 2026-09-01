import { apiError, authenticate, handleOptions, json } from "@/lib/api-auth"
import { listInvoices } from "@/lib/operations/entries"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/v1/invoices — faturas por cartão/período e blocos de pagamento. */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  try {
    const { invoices, paymentBlocks } = await listInvoices(auth.user)
    return json({ success: true, invoices, paymentBlocks })
  } catch (error) {
    console.error("[api] erro ao gerar faturas:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
