import { invoiceService, userService } from "@/lib/dynamodb"
import { sendPushToUsers } from "@/lib/push"
import { apiError, json } from "@/lib/api-auth"
import {
  getInvoiceClosingDate,
  getInvoiceDueDate,
  invoiceClosingNotification,
  invoiceDueNotification,
  invoiceOverdueNotification,
} from "@toliso/core"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/v1/cron/invoice-reminders — checagem diária de fechamento/vencimento
 * de fatura, disparada pelo cron da Vercel (ver `vercel.json`).
 *
 * Existia só como lembrete agendado no aparelho (`scheduleInvoiceReminders`
 * no mobile), o que falhava sempre que o app ficava muito tempo sem abrir.
 * Este endpoint é o equivalente do lado do servidor, usando os mesmos
 * limiares de dias para manter a mensagem idêntica nas duas fontes.
 */

const CLOSING_REMINDER_DAYS = [3, 1]
const DUE_REMINDER_DAYS = [3, 1, 0]
/** Dispara só no dia seguinte ao vencimento — uma vez, não todo dia em que a fatura seguir aberta. */
const OVERDUE_REMINDER_DAY = -1

/** Diferença em dias de calendário entre duas datas (ignora o horário). */
function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return apiError("Não autorizado", 401)
  }

  const today = new Date()
  let usersChecked = 0
  let notificationsSent = 0

  try {
    const users = await userService.getActiveUsers()
    usersChecked = users.length

    for (const user of users) {
      const { invoices } = await invoiceService.generateInvoices(user.id)

      for (const invoice of invoices) {
        if (invoice.balance <= 0.005) continue

        const dueDate = getInvoiceDueDate(invoice.period, invoice.dueDate)
        const closingDate = getInvoiceClosingDate(invoice.period, invoice.closingDate)

        const daysToDue = daysBetween(today, dueDate)
        const daysToClosing = daysBetween(today, closingDate)

        if (DUE_REMINDER_DAYS.includes(daysToDue)) {
          notificationsSent += await sendPushToUsers(
            [user.id],
            invoiceDueNotification({
              cardName: invoice.cardName,
              period: invoice.period,
              balance: invoice.balance,
              daysAhead: daysToDue,
            }),
          )
        } else if (daysToDue === OVERDUE_REMINDER_DAY) {
          notificationsSent += await sendPushToUsers(
            [user.id],
            invoiceOverdueNotification({
              cardName: invoice.cardName,
              period: invoice.period,
              balance: invoice.balance,
            }),
          )
        }

        if (CLOSING_REMINDER_DAYS.includes(daysToClosing)) {
          notificationsSent += await sendPushToUsers(
            [user.id],
            invoiceClosingNotification({
              cardName: invoice.cardName,
              period: invoice.period,
              total: invoice.totalExpenses,
              daysAhead: daysToClosing,
            }),
          )
        }
      }
    }

    return json({ success: true, usersChecked, notificationsSent })
  } catch (error) {
    console.error("[cron] falha ao checar lembretes de fatura:", error)
    return apiError("Erro interno do servidor", 500)
  }
}
