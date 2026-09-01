import { entryService, transactionService, userService } from "@/lib/dynamodb"
import { sendEmail } from "@/lib/email"
import { OperationError } from "@/lib/operations/transactions"
import { getCurrentPeriod, getPeriodDisplay, isInPeriod, sumAmount } from "@toliso/core"

/**
 * Relatório de gastos por e-mail — a mesma ação disponível na web (tela de
 * usuários) e no aplicativo. Reaproveita o cálculo de período de
 * `@toliso/core`, a mesma fonte de verdade usada em toda a plataforma.
 */
export async function sendUserExpenseReport(userId: string, period?: string): Promise<{ message: string }> {
  const user = await userService.getById(userId)
  if (!user) throw new OperationError("Usuário não encontrado", 404)

  const targetPeriod = period || getCurrentPeriod()
  const periodDisplay = getPeriodDisplay(targetPeriod)

  const [allTransactions, allEntries] = await Promise.all([transactionService.getAll(), entryService.getAll()])

  const periodTransactions = (allTransactions ?? []).filter(
    (transaction) => transaction.userId === userId && isInPeriod(transaction.date, targetPeriod),
  )
  const periodPayments = (allEntries ?? []).filter(
    (entry) => entry.userId === userId && isInPeriod(entry.date, targetPeriod),
  )

  const totalExpenses = sumAmount(periodTransactions)
  const totalPayments = sumAmount(periodPayments)

  const result = await sendEmail({
    to: user.email,
    subject: `Relatório de Gastos - ${periodDisplay}`,
    html: buildReportEmailHtml({
      userName: user.name,
      periodDisplay,
      totalExpenses,
      totalPayments,
      transactionCount: periodTransactions.length,
    }),
  })

  if ("error" in result) throw new OperationError(result.error, 502)

  return { message: `Email enviado para ${user.name}!` }
}

function buildReportEmailHtml(input: {
  userName: string
  periodDisplay: string
  totalExpenses: number
  totalPayments: number
  transactionCount: number
}): string {
  const { userName, periodDisplay, totalExpenses, totalPayments, transactionCount } = input
  const balance = totalExpenses - totalPayments
  const money = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <img src="https://toliso.hezo.dev.br/ToLiso-Logo-Cor.png" alt="To Liso Logo" width="150" style="display:block;" />
            <h2 style="color: #2ECC71; margin: 10px 0;">To Liso</h2>
          </td>
        </tr>

        <tr>
          <td align="left" style="padding: 0 20px;">
            <p>Olá, <strong>${userName}</strong>!</p>
            <p>Segue o resumo dos seus gastos no período <strong>${periodDisplay}</strong>:</p>
          </td>
        </tr>

        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
              style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <tr>
                <td align="center">
                  <h3 style="color: #e74c3c; margin-top: 0;">Total de Gastos</h3>
                  <p style="font-size: 32px; font-weight: bold; color: #e74c3c; margin: 10px 0;">
                    R$ ${money(totalExpenses)}
                  </p>
                  <p style="color: #666; margin-bottom: 0;">
                    ${transactionCount} transa${transactionCount !== 1 ? "ções" : "ção"} registrada${transactionCount !== 1 ? "s" : ""}
                  </p>
                </td>
              </tr>
            </table>
            <p style="color: #333;">
              Pagamentos no período: <strong>R$ ${money(totalPayments)}</strong><br />
              Saldo: <strong style="color: ${balance > 0 ? "#e74c3c" : "#2ECC71"};">R$ ${money(Math.abs(balance))}</strong>
              ${balance > 0 ? "a pagar" : "a favor"}
            </p>
          </td>
        </tr>

        <tr>
          <td align="center">
            <p>Acesse a plataforma para ver mais detalhes sobre suas despesas.</p>
            <a href="https://toliso.hezo.dev.br/"
              style="display: inline-block; padding: 10px 20px; background-color: #2ECC71; color: #fff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; margin-top: 20px;">
              Ir para a plataforma
            </a>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding: 30px 0;">
            <hr style="border: none; border-top: 1px solid #ddd; width: 80%;" />
            <p style="color: #999; font-size: 12px;">Este é um email automático. Por favor, não responda.</p>
          </td>
        </tr>
      </table>
    </div>
  `
}
