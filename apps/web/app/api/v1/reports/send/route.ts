import { apiError, authenticateAdmin, handleOptions, json, readJson } from "@/lib/api-auth"
import { sendUserExpenseReport } from "@/lib/operations/reports"
import { OperationError } from "@/lib/operations/transactions"
import type { SendReportPayload } from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** POST /api/v1/reports/send — envia o relatório de gastos por e-mail (somente admin). */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request)
  if (!auth.ok) return auth.response

  const payload = await readJson<SendReportPayload>(request)
  if (!payload?.userId) return apiError("Corpo da requisição inválido")

  try {
    const result = await sendUserExpenseReport(payload.userId, payload.period)
    return json({ success: true, message: result.message })
  } catch (error) {
    if (error instanceof OperationError) return apiError(error.message, error.status)
    console.error("[api] erro ao enviar relatório:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
