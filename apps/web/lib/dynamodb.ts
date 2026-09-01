import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb"
import {
  buildInvoices,
  getInvoicePeriod as getInvoicePeriodCore,
  type CreditCard,
  type Entry,
  type Invoice,
  type PaymentBlock,
  type PushToken,
  type Transaction,
  type User,
} from "@toliso/core"

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
  PUSH_TOKENS: "pushTokensTL",
}

// Tipos — definidos uma unica vez em @toliso/core e reexportados aqui para
// manter compatibilidade com os imports existentes (`from "@/lib/dynamodb"`).
export type {
  User,
  PublicUser,
  CreditCard,
  Transaction,
  Entry,
  Invoice,
  PaymentBlock,
  PushToken,
  UserRole,
  EntityStatus,
  CardBrand,
  DivisionType,
} from "@toliso/core"

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

// Funções utilitárias para faturas.
// O cálculo em si vive em @toliso/core (buildInvoices) para que web e mobile
// derivem exatamente os mesmos valores a partir dos mesmos registros.
export const invoiceService = {
  getInvoicePeriod(date: Date, closingDate = 16): { period: string; periodDisplay: string } {
    return getInvoicePeriodCore(date, { closingDate, monthFormat: "long" })
  },

  async generateInvoices(userId: string): Promise<{ invoices: Invoice[]; paymentBlocks: PaymentBlock[] }> {
    const [transactions, entries, cards] = await Promise.all([
      transactionService.getByUserId(userId),
      entryService.getByUserId(userId),
      cardService.getAll(),
    ])

    return buildInvoices(transactions ?? [], entries ?? [], cards ?? [])
  },
}

// Funções para tokens de push (aplicativo mobile).
// A chave primária da tabela `pushTokensTL` é o próprio token do Expo, o que
// torna o registro idempotente: reinstalar o app apenas sobrescreve o dono.
export const pushTokenService = {
  async register(token: Omit<PushToken, "createdAt" | "updatedAt">) {
    const now = new Date().toISOString()

    const existing = await this.getByToken(token.token)

    const record: PushToken = {
      ...token,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await dynamodb.send(
      new PutCommand({
        TableName: TABLES.PUSH_TOKENS,
        Item: record,
      }),
    )

    return record
  },

  async getByToken(token: string) {
    const result = await dynamodb.send(
      new GetCommand({
        TableName: TABLES.PUSH_TOKENS,
        Key: { token },
      }),
    )

    return result.Item as PushToken | undefined
  },

  async getByUserId(userId: string) {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.PUSH_TOKENS,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
      }),
    )

    return (result.Items as PushToken[]) ?? []
  },

  async getByUserIds(userIds: string[]) {
    if (userIds.length === 0) return []

    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLES.PUSH_TOKENS,
      }),
    )

    const tokens = (result.Items as PushToken[]) ?? []
    const wanted = new Set(userIds)
    return tokens.filter((item) => wanted.has(item.userId))
  },

  async delete(token: string) {
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLES.PUSH_TOKENS,
        Key: { token },
      }),
    )
  },
}
