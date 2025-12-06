import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const dynamodb = DynamoDBDocumentClient.from(client)

// Tabelas
export const TABLES = {
  USERS: "usersTL",
  CARDS: "cardsTL",
  TRANSACTIONS: "transactionsTL",
  ENTRIES: "entriesTL",
}

// Tipos
export interface User {
  id: string
  email: string
  name: string
  password: string
  role: "admin" | "user"
  status: "active" | "inactive"
  createdAt: string
  updatedAt: string
}

export interface CreditCard {
  id: string
  name: string
  bank: string
  type: "visa" | "mastercard" | "elo" | "american-express"
  color: string
  status: "active" | "inactive"
  dueDate: number
  closingDate: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  userName: string
  userEmail: string
  title: string
  description: string
  amount: number
  originalAmount?: number
  cardId: string
  cardName: string
  date: string
  // Campos para parcelamento
  isInstallment: boolean
  totalInstallments?: number
  currentInstallment?: number
  installmentGroup?: string
  // Campos para divisão entre usuários
  isShared: boolean
  divisionType?: "equal" | "custom"
  sharedWith?: string[]
  sharedUserNames?: string[]
  // Campos para recorrência
  isRecurring?: boolean
  recurringGroup?: string
  recurringMonth?: number
  createdAt: string
  updatedAt: string
}

export interface Entry {
  id: string
  userId: string
  userName: string
  userEmail: string
  title: string
  description: string
  amount: number
  date: string
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  cardId: string
  cardName: string
  cardColor: string
  cardType: "visa" | "mastercard" | "elo" | "american-express"
  dueDate: number
  closingDate: number
  period: string
  periodDisplay: string
  transactions: Transaction[]
  totalExpenses: number
  balance: number
  paymentsApplied: number
}

export interface PaymentBlock {
  period: string
  periodDisplay: string
  entries: Entry[]
  totalEntries: number
}

// Funções para Users
export const userService = {
  async create(user: Omit<User, "id" | "createdAt" | "updatedAt">) {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const newUser: User = {
      ...user,
      id,
      createdAt: now,
      updatedAt: now,
    }

    await dynamodb.send(
      new PutCommand({
        TableName: TABLES.USERS,
        Item: newUser,
      }),
    )

    return newUser
  },

  async getByEmail(email: string) {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
      }),
    )

    const user = result.Items?.[0] as User | undefined
    return user
  },

  async getById(id: string) {
    const result = await dynamodb.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { id },
      }),
    )

    return result.Item as User | undefined
  },

  async getAll() {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.USERS,
      }),
    )
    return result.Items as User[]
  },

  async getActiveUsers() {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "active",
        },
      }),
    )

    return result.Items as User[]
  },

  async update(id: string, updates: Partial<Omit<User, "id" | "createdAt">>) {
    const now = new Date().toISOString()

    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { id },
        UpdateExpression:
          "SET #updatedAt = :updatedAt" +
          Object.keys(updates)
            .map((key) => `, #${key} = :${key}`)
            .join(""),
        ExpressionAttributeNames: {
          "#updatedAt": "updatedAt",
          ...Object.keys(updates).reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {}),
        },
        ExpressionAttributeValues: {
          ":updatedAt": now,
          ...Object.entries(updates).reduce((acc, [key, value]) => ({ ...acc, [`:${key}`]: value }), {}),
        },
      }),
    )
  },

  async delete(id: string) {
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLES.USERS,
        Key: { id },
      }),
    )
  },
}

// Funções para Cards
export const cardService = {
  async create(card: Omit<CreditCard, "id" | "createdAt" | "updatedAt">) {
    const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const newCard: CreditCard = {
      ...card,
      id,
      createdAt: now,
      updatedAt: now,
    }

    await dynamodb.send(
      new PutCommand({
        TableName: TABLES.CARDS,
        Item: newCard,
      }),
    )

    return newCard
  },

  async getAll() {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.CARDS,
      }),
    )
    return result.Items as CreditCard[]
  },

  async getById(id: string) {
    const result = await dynamodb.send(
      new GetCommand({
        TableName: TABLES.CARDS,
        Key: { id },
      }),
    )

    return result.Item as CreditCard | undefined
  },

  async update(id: string, updates: Partial<Omit<CreditCard, "id" | "createdAt">>) {
    const now = new Date().toISOString()

    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLES.CARDS,
        Key: { id },
        UpdateExpression:
          "SET #updatedAt = :updatedAt" +
          Object.keys(updates)
            .map((key) => `, #${key} = :${key}`)
            .join(""),
        ExpressionAttributeNames: {
          "#updatedAt": "updatedAt",
          ...Object.keys(updates).reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {}),
        },
        ExpressionAttributeValues: {
          ":updatedAt": now,
          ...Object.entries(updates).reduce((acc, [key, value]) => ({ ...acc, [`:${key}`]: value }), {}),
        },
      }),
    )
  },

  async delete(id: string) {
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLES.CARDS,
        Key: { id },
      }),
    )
  },
}

// Funções para Transactions
export const transactionService = {
  async create(transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">) {
    const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const newTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: now,
      updatedAt: now,
    }

    await dynamodb.send(
      new PutCommand({
        TableName: TABLES.TRANSACTIONS,
        Item: newTransaction,
      }),
    )

    return newTransaction
  },

  async createMultiple(transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[]) {
    const now = new Date().toISOString()
    const createdTransactions: Transaction[] = []

    for (const transaction of transactions) {
      const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newTransaction: Transaction = {
        ...transaction,
        id,
        createdAt: now,
        updatedAt: now,
      }

      await dynamodb.send(
        new PutCommand({
          TableName: TABLES.TRANSACTIONS,
          Item: newTransaction,
        }),
      )

      createdTransactions.push(newTransaction)
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    return createdTransactions
  },

  async getAll() {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS,
      }),
    )

    return result.Items as Transaction[]
  },

  async getByUserId(userId: string) {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS,
        FilterExpression: "userId = :userId OR contains(sharedWith, :userId)",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      }),
    )

    return result.Items as Transaction[]
  },

  async getByInstallmentGroup(installmentGroup: string) {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS,
        FilterExpression: "installmentGroup = :installmentGroup",
        ExpressionAttributeValues: {
          ":installmentGroup": installmentGroup,
        },
      }),
    )

    return (result.Items as Transaction[]) || []
  },

  async update(id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) {
    const now = new Date().toISOString()

    const updateExpressions: string[] = ["#updatedAt = :updatedAt"]
    const attributeNames: Record<string, string> = { "#updatedAt": "updatedAt" }
    const attributeValues: Record<string, any> = { ":updatedAt": now }

    Object.keys(updates).forEach((key) => {
      updateExpressions.push(`#${key} = :${key}`)
      attributeNames[`#${key}`] = key
      attributeValues[`:${key}`] = updates[key as keyof typeof updates]
    })

    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLES.TRANSACTIONS,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributeValues,
      }),
    )
  },

  async delete(id: string) {
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLES.TRANSACTIONS,
        Key: { id },
      }),
    )
  },

  async deleteByInstallmentGroup(installmentGroup: string) {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS,
        FilterExpression: "installmentGroup = :installmentGroup",
        ExpressionAttributeValues: {
          ":installmentGroup": installmentGroup,
        },
      }),
    )

    if (result.Items) {
      for (const item of result.Items) {
        await dynamodb.send(
          new DeleteCommand({
            TableName: TABLES.TRANSACTIONS,
            Key: { id: item.id },
          }),
        )
      }
    }
  },

  async deleteByRecurringGroup(recurringGroup: string) {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS,
        FilterExpression: "recurringGroup = :recurringGroup",
        ExpressionAttributeValues: {
          ":recurringGroup": recurringGroup,
        },
      }),
    )

    if (result.Items) {
      for (const item of result.Items) {
        await dynamodb.send(
          new DeleteCommand({
            TableName: TABLES.TRANSACTIONS,
            Key: { id: item.id },
          }),
        )
      }
    }
  },
}

// Funções para Entries
export const entryService = {
  async create(entry: Omit<Entry, "id" | "createdAt" | "updatedAt">) {
    const id = `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const newEntry: Entry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
    }

    await dynamodb.send(
      new PutCommand({
        TableName: TABLES.ENTRIES,
        Item: newEntry,
      }),
    )

    return newEntry
  },

  async getAll() {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.ENTRIES,
      }),
    )
    return result.Items as Entry[]
  },

  async getByUserId(userId: string) {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.ENTRIES,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      }),
    )

    return result.Items as Entry[]
  },

  async delete(id: string) {
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLES.ENTRIES,
        Key: { id },
      }),
    )
  },
}

// Funções utilitárias para faturas
export const invoiceService = {
  getInvoicePeriod(date: Date, closingDate = 16): { period: string; periodDisplay: string } {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]

    if (day >= closingDate) {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const period = `${nextYear}-${nextMonth.toString().padStart(2, "0")}`

      const startDay = `${closingDate.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`
      const endDay = `${(closingDate - 1).toString().padStart(2, "0")}/${nextMonth.toString().padStart(2, "0")}`
      const periodDisplay = `${monthNames[nextMonth - 1]}/${nextYear} (${startDay} - ${endDay})`

      return { period, periodDisplay }
    } else {
      const period = `${year}-${month.toString().padStart(2, "0")}`

      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const startDay = `${closingDate.toString().padStart(2, "0")}/${prevMonth.toString().padStart(2, "0")}`
      const endDay = `${(closingDate - 1).toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`
      const periodDisplay = `${monthNames[month - 1]}/${year} (${startDay} - ${endDay})`

      return { period, periodDisplay }
    }
  },

  async generateInvoices(userId: string): Promise<{ invoices: Invoice[]; paymentBlocks: PaymentBlock[] }> {
    const [transactions, entries, cards] = await Promise.all([
      transactionService.getByUserId(userId),
      entryService.getByUserId(userId),
      cardService.getAll(),
    ])

    const activeCards = cards.filter((card) => card.status === "active")
    const invoices: Invoice[] = []

    for (const card of activeCards) {
      const cardTransactions = transactions.filter((t) => t.cardId === card.id)

      const groupedTransactions = new Map<string, Transaction>()

      for (const transaction of cardTransactions) {
        if (transaction.recurringGroup && transaction.isInstallment) {
          const key = `recurring-${transaction.recurringGroup}-${transaction.currentInstallment || 1}`
          if (!groupedTransactions.has(key)) {
            const representativeTransaction = {
              ...transaction,
              amount: transaction.originalAmount || transaction.amount,
              title: transaction.title.replace(/ - .+$/, ""),
            }
            groupedTransactions.set(key, representativeTransaction)
          }
        } else if (transaction.isShared && transaction.installmentGroup) {
          const key = `shared-inst-${transaction.installmentGroup}-${transaction.currentInstallment || 1}`
          const existingTransaction = groupedTransactions.get(key)

          if (!existingTransaction) {
            const installmentValue = transaction.originalAmount
              ? transaction.originalAmount / (transaction.totalInstallments || 1)
              : transaction.amount

            const representativeTransaction = {
              ...transaction,
              amount: installmentValue,
              title: transaction.title.replace(/ - (Compartilhado|Parte .+)/, ""),
            }
            groupedTransactions.set(key, representativeTransaction)
          }
        } else if (transaction.isShared && !transaction.installmentGroup) {
          const key = `shared-${transaction.title.replace(/ - (Compartilhado|Parte .+)/, "")}-${transaction.date}`
          if (!groupedTransactions.has(key)) {
            const representativeTransaction = {
              ...transaction,
              amount: transaction.originalAmount || transaction.amount,
              title: transaction.title.replace(/ - (Compartilhado|Parte .+)/, ""),
            }
            groupedTransactions.set(key, representativeTransaction)
          }
        } else if (transaction.installmentGroup && !transaction.isShared) {
          const key = `inst-${transaction.installmentGroup}-${transaction.currentInstallment || 1}`
          if (!groupedTransactions.has(key)) {
            groupedTransactions.set(key, transaction)
          }
        } else if (transaction.recurringGroup && !transaction.isInstallment) {
          const key = `recurring-${transaction.recurringGroup}`
          if (!groupedTransactions.has(key)) {
            groupedTransactions.set(key, transaction)
          }
        } else {
          const key = transaction.id
          groupedTransactions.set(key, transaction)
        }
      }

      const finalTransactions = Array.from(groupedTransactions.values())
      const transactionsByPeriod = new Map<string, { transactions: Transaction[]; periodDisplay: string }>()

      for (const transaction of finalTransactions) {
        const { period, periodDisplay } = this.getInvoicePeriod(new Date(transaction.date), card.closingDate)
        if (!transactionsByPeriod.has(period)) {
          transactionsByPeriod.set(period, { transactions: [], periodDisplay })
        }
        transactionsByPeriod.get(period)!.transactions.push(transaction)
      }

      for (const [period, { transactions: periodTransactions, periodDisplay }] of transactionsByPeriod) {
        const totalExpenses = periodTransactions.reduce((sum, t) => sum + Number(t.amount), 0)

        const periodEntries = entries.filter((entry) => {
          const { period: entryPeriod } = this.getInvoicePeriod(new Date(entry.date), card.closingDate)
          return entryPeriod === period
        })
        const paymentsApplied = periodEntries.reduce((sum, e) => sum + Number(e.amount), 0)

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
      const { period, periodDisplay } = this.getInvoicePeriod(new Date(entry.date))
      if (!entriesByPeriod.has(period)) {
        entriesByPeriod.set(period, { entries: [], periodDisplay })
      }
      entriesByPeriod.get(period)!.entries.push(entry)
    }

    const paymentBlocks: PaymentBlock[] = []
    for (const [period, { entries: periodEntries, periodDisplay }] of entriesByPeriod) {
      const totalEntries = periodEntries.reduce((sum, e) => sum + Number(e.amount), 0)

      paymentBlocks.push({
        period,
        periodDisplay,
        entries: periodEntries,
        totalEntries,
      })
    }

    return {
      invoices: invoices.sort((a, b) => b.period.localeCompare(a.period)),
      paymentBlocks: paymentBlocks.sort((a, b) => b.period.localeCompare(a.period)),
    }
  },
}
