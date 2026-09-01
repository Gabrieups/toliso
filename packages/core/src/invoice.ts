/**
 * Agregacao de faturas — funcoes puras, sem acesso a banco.
 *
 * `lib/dynamodb.ts` (web) carrega os dados do DynamoDB e delega o calculo para
 * ca; o app mobile consome o resultado ja pronto pela API REST. Assim os dois
 * clientes veem exatamente os mesmos numeros.
 */

import { getInvoicePeriod, type PeriodOptions } from "./period"
import type { CreditCard, Entry, Invoice, PaymentBlock, Transaction } from "./types"

/**
 * Reduz as transacoes de um cartao a uma linha por compra real.
 *
 * Uma unica compra pode virar varias linhas no banco (uma por usuario quando
 * dividida, uma por parcela, uma por mes quando recorrente). Para a fatura
 * queremos o valor cheio da compra, uma vez so.
 */
export function dedupeCardTransactions(cardTransactions: Transaction[]): Transaction[] {
  const grouped = new Map<string, Transaction>()

  for (const transaction of cardTransactions) {
    if (transaction.recurringGroup && transaction.isInstallment) {
      const key = `recurring-${transaction.recurringGroup}-${transaction.currentInstallment || 1}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          ...transaction,
          amount: transaction.originalAmount || transaction.amount,
          title: transaction.title.replace(/ - .+$/, ""),
        })
      }
    } else if (transaction.isShared && transaction.installmentGroup) {
      const key = `shared-inst-${transaction.installmentGroup}-${transaction.currentInstallment || 1}`
      if (!grouped.has(key)) {
        const installmentValue = transaction.originalAmount
          ? transaction.originalAmount / (transaction.totalInstallments || 1)
          : transaction.amount

        grouped.set(key, {
          ...transaction,
          amount: installmentValue,
          title: transaction.title.replace(/ - (Compartilhado|Parte .+)/, ""),
        })
      }
    } else if (transaction.isShared && !transaction.installmentGroup) {
      const baseTitle = transaction.title.replace(/ - (Compartilhado|Parte .+)/, "")
      const key = `shared-${baseTitle}-${transaction.date}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          ...transaction,
          amount: transaction.originalAmount || transaction.amount,
          title: baseTitle,
        })
      }
    } else if (transaction.installmentGroup && !transaction.isShared) {
      const key = `inst-${transaction.installmentGroup}-${transaction.currentInstallment || 1}`
      if (!grouped.has(key)) grouped.set(key, transaction)
    } else if (transaction.recurringGroup && !transaction.isInstallment) {
      const key = `recurring-${transaction.recurringGroup}`
      if (!grouped.has(key)) grouped.set(key, transaction)
    } else {
      grouped.set(transaction.id, transaction)
    }
  }

  return Array.from(grouped.values())
}

/**
 * Agrupa despesas divididas para exibicao em listas (dashboard/historico):
 * cada compra compartilhada aparece uma unica vez, com o valor total.
 */
export function groupSharedTransactions(transactions: Transaction[]): Transaction[] {
  const grouped: Record<string, Transaction> = {}
  const individual: Transaction[] = []

  for (const transaction of transactions) {
    if (transaction.isShared && transaction.installmentGroup) {
      const key = `${transaction.installmentGroup}-${transaction.currentInstallment || 1}`
      if (!grouped[key]) {
        grouped[key] = {
          ...transaction,
          title: transaction.title.replace(/ - Parte .*$/, "").replace(/ - Compartilhado$/, ""),
          amount: transaction.originalAmount || transaction.amount,
          description: `Despesa compartilhada entre ${transaction.sharedUserNames?.join(", ") ?? ""}`,
        }
      }
    } else if (transaction.isShared) {
      const dateKey = new Date(transaction.date).toISOString().split("T")[0]
      const baseTitle = transaction.title.replace(/ - Parte .*$/, "").replace(/ - Compartilhado$/, "")
      const key = `${baseTitle}-${dateKey}`
      if (!grouped[key]) {
        grouped[key] = {
          ...transaction,
          title: baseTitle,
          amount: transaction.originalAmount || transaction.amount,
          description: `Despesa compartilhada entre ${transaction.sharedUserNames?.join(", ") ?? ""}`,
        }
      }
    } else {
      individual.push(transaction)
    }
  }

  return [...Object.values(grouped), ...individual]
}

/** Soma o campo `amount` de uma colecao de lancamentos. */
export function sumAmount(items: Array<{ amount: number }>): number {
  return items.reduce((total, item) => total + Number(item.amount), 0)
}

/**
 * Monta as faturas por cartao/periodo e os blocos de pagamento do usuario.
 *
 * @param transactions Transacoes visiveis ao usuario.
 * @param entries      Pagamentos do usuario.
 * @param cards        Todos os cartoes (apenas os ativos sao considerados).
 */
export function buildInvoices(
  transactions: Transaction[],
  entries: Entry[],
  cards: CreditCard[],
): { invoices: Invoice[]; paymentBlocks: PaymentBlock[] } {
  const periodOptions: PeriodOptions = { monthFormat: "long" }
  const activeCards = cards.filter((card) => card.status === "active")
  const invoices: Invoice[] = []

  for (const card of activeCards) {
    const cardTransactions = transactions.filter((transaction) => transaction.cardId === card.id)
    const finalTransactions = dedupeCardTransactions(cardTransactions)

    const transactionsByPeriod = new Map<string, { transactions: Transaction[]; periodDisplay: string }>()

    for (const transaction of finalTransactions) {
      const { period, periodDisplay } = getInvoicePeriod(new Date(transaction.date), {
        ...periodOptions,
        closingDate: card.closingDate,
      })
      if (!transactionsByPeriod.has(period)) {
        transactionsByPeriod.set(period, { transactions: [], periodDisplay })
      }
      transactionsByPeriod.get(period)!.transactions.push(transaction)
    }

    for (const [period, { transactions: periodTransactions, periodDisplay }] of transactionsByPeriod) {
      const totalExpenses = sumAmount(periodTransactions)

      const periodEntries = entries.filter((entry) => {
        const { period: entryPeriod } = getInvoicePeriod(new Date(entry.date), {
          ...periodOptions,
          closingDate: card.closingDate,
        })
        return entryPeriod === period
      })
      const paymentsApplied = sumAmount(periodEntries)

      invoices.push({
        cardId: card.id,
        cardName: card.name,
        cardColor: card.color,
        cardType: card.type,
        dueDate: card.dueDate,
        closingDate: card.closingDate,
        period,
        periodDisplay,
        transactions: periodTransactions,
        totalExpenses,
        balance: totalExpenses - paymentsApplied,
        paymentsApplied,
      })
    }
  }

  const entriesByPeriod = new Map<string, { entries: Entry[]; periodDisplay: string }>()

  for (const entry of entries) {
    const { period, periodDisplay } = getInvoicePeriod(new Date(entry.date), periodOptions)
    if (!entriesByPeriod.has(period)) {
      entriesByPeriod.set(period, { entries: [], periodDisplay })
    }
    entriesByPeriod.get(period)!.entries.push(entry)
  }

  const paymentBlocks: PaymentBlock[] = []
  for (const [period, { entries: periodEntries, periodDisplay }] of entriesByPeriod) {
    paymentBlocks.push({
      period,
      periodDisplay,
      entries: periodEntries,
      totalEntries: sumAmount(periodEntries),
    })
  }

  return {
    invoices: invoices.sort((a, b) => b.period.localeCompare(a.period)),
    paymentBlocks: paymentBlocks.sort((a, b) => b.period.localeCompare(a.period)),
  }
}

/** Total gasto por cartao dentro de uma colecao ja filtrada por periodo. */
export function totalsByCard(
  transactions: Transaction[],
  cards: Array<{ name: string; color: string }>,
): Array<{ cardName: string; cardColor: string; total: number }> {
  return cards.map((card) => ({
    cardName: card.name,
    cardColor: card.color,
    total: sumAmount(transactions.filter((transaction) => transaction.cardName === card.name)),
  }))
}
