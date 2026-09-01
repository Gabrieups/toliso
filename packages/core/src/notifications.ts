/**
 * Conteudo das notificacoes — compartilhado para que o push enviado pelo
 * servidor e o lembrete agendado localmente no aparelho falem a mesma lingua.
 */

import { formatCurrency } from "./format"
import { getPeriodDisplay } from "./period"

export type NotificationKind =
  | "expense-shared"
  | "expense-created-for-you"
  | "payment-registered"
  | "invoice-closing"
  | "invoice-due"
  | "invoice-overdue"

export interface NotificationContent {
  title: string
  body: string
  data: Record<string, unknown>
}

/** Uma despesa dividida com o usuario foi criada por outra pessoa. */
export function sharedExpenseNotification(params: {
  authorName: string
  title: string
  amount: number
  cardName: string
}): NotificationContent {
  return {
    title: "Nova despesa compartilhada",
    body: `${params.authorName} dividiu "${params.title}" com você — sua parte é ${formatCurrency(params.amount)} no ${params.cardName}.`,
    data: { kind: "expense-shared" satisfies NotificationKind, screen: "/(tabs)/home" },
  }
}

/** Um administrador lancou uma despesa em nome do usuario. */
export function expenseForYouNotification(params: {
  authorName: string
  title: string
  amount: number
  cardName: string
}): NotificationContent {
  return {
    title: "Despesa lançada na sua conta",
    body: `${params.authorName} registrou "${params.title}" (${formatCurrency(params.amount)}) no ${params.cardName}.`,
    data: { kind: "expense-created-for-you" satisfies NotificationKind, screen: "/(tabs)/home" },
  }
}

/** Um pagamento foi registrado para o usuario. */
export function paymentNotification(params: {
  authorName: string
  title: string
  amount: number
}): NotificationContent {
  return {
    title: "Pagamento registrado",
    body: `${params.authorName} registrou o pagamento "${params.title}" de ${formatCurrency(params.amount)}.`,
    data: { kind: "payment-registered" satisfies NotificationKind, screen: "/(tabs)/home" },
  }
}

/** Lembrete: a fatura fecha hoje/amanha. */
export function invoiceClosingNotification(params: {
  cardName: string
  period: string
  total: number
  daysAhead: number
}): NotificationContent {
  const quando = params.daysAhead <= 0 ? "hoje" : params.daysAhead === 1 ? "amanhã" : `em ${params.daysAhead} dias`
  return {
    title: `Fatura do ${params.cardName} fecha ${quando}`,
    body: `${getPeriodDisplay(params.period, { includeRange: false })} acumula ${formatCurrency(params.total)} até agora.`,
    data: { kind: "invoice-closing" satisfies NotificationKind, screen: "/(tabs)/invoices", period: params.period },
  }
}

/** Lembrete: a fatura vence hoje/em N dias. */
export function invoiceDueNotification(params: {
  cardName: string
  period: string
  balance: number
  daysAhead: number
}): NotificationContent {
  const quando = params.daysAhead <= 0 ? "vence hoje" : params.daysAhead === 1 ? "vence amanhã" : `vence em ${params.daysAhead} dias`
  return {
    title: `Fatura do ${params.cardName} ${quando}`,
    body: `Saldo devedor de ${formatCurrency(params.balance)} — ${getPeriodDisplay(params.period, { includeRange: false })}.`,
    data: { kind: "invoice-due" satisfies NotificationKind, screen: "/(tabs)/invoices", period: params.period },
  }
}
