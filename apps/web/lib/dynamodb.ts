import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  TransactWriteCommand,
  BatchWriteCommand,
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

/** Mais recente primeiro — usado para ordenar despesas e pagamentos por quando foram incluídos. */
function byCreatedAtDesc(a: { createdAt: string }, b: { createdAt: string }): number {
  return b.createdAt.localeCompare(a.createdAt)
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

/**
 * Faz o Scan percorrer TODAS as paginas da tabela. O DynamoDB limita cada
 * Scan a 1MB — um `dynamodb.send(new ScanCommand(...))` direto so retorna a
 * primeira pagina e descarta o resto silenciosamente (sem erro, sem aviso).
 * Qualquer tabela que passe de ~1MB (como `transactionsTL` ja passou) teria
 * leituras incompletas sem isso.
 */
async function scanAll<T>(
  params: Omit<ConstructorParameters<typeof ScanCommand>[0], "ExclusiveStartKey">,
): Promise<T[]> {
  const items: T[] = []
  let exclusiveStartKey: Record<string, unknown> | undefined

  do {
    const result = await dynamodb.send(new ScanCommand({ ...params, ExclusiveStartKey: exclusiveStartKey }))
    if (result.Items) items.push(...(result.Items as T[]))
    exclusiveStartKey = result.LastEvaluatedKey
  } while (exclusiveStartKey)

  return items
}

async function batchDeleteByIds(tableName: string, ids: string[]): Promise<void> {
  for (const batch of chunk(ids, 25)) {
    await dynamodb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((id) => ({ DeleteRequest: { Key: { id } } })),
        },
      }),
    )
  }
}

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
    const items = await scanAll<User>({
      TableName: TABLES.USERS,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    })

    return items[0]
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
    return scanAll<User>({ TableName: TABLES.USERS })
  },

  async getActiveUsers() {
    return scanAll<User>({
      TableName: TABLES.USERS,
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "active",
      },
    })
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
    const cards = await scanAll<CreditCard>({ TableName: TABLES.CARDS })
    return cards.sort((a, b) => a.name.localeCompare(b.name))
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

  /**
   * Grava uma compra que vira varias linhas (parcelas, divisao entre usuarios,
   * recorrencia). Cada lote de ate 100 linhas e gravado como uma transacao
   * atomica do DynamoDB (tudo ou nada); se um lote seguinte falhar, os lotes
   * ja gravados sao desfeitos, para nunca deixar a compra com linhas faltando.
   */
  async createMultiple(transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[]) {
    const now = new Date().toISOString()
    const createdTransactions: Transaction[] = transactions.map((transaction) => ({
      ...transaction,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    }))

    const batches = chunk(createdTransactions, 100)
    const committedIds: string[] = []

    try {
      for (const batch of batches) {
        await dynamodb.send(
          new TransactWriteCommand({
            TransactItems: batch.map((item) => ({
              Put: { TableName: TABLES.TRANSACTIONS, Item: item },
            })),
          }),
        )
        committedIds.push(...batch.map((item) => item.id))
      }
    } catch (error) {
      await batchDeleteByIds(TABLES.TRANSACTIONS, committedIds)
      throw error
    }

    return createdTransactions
  },

  async getAll() {
    const items = await scanAll<Transaction>({ TableName: TABLES.TRANSACTIONS })
    return items.sort(byCreatedAtDesc)
  },

  async getByUserId(userId: string) {
    const items = await scanAll<Transaction>({
      TableName: TABLES.TRANSACTIONS,
      FilterExpression: "userId = :userId OR contains(sharedWith, :userId)",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    })

    return items.sort(byCreatedAtDesc)
  },

  async getByInstallmentGroup(installmentGroup: string) {
    return scanAll<Transaction>({
      TableName: TABLES.TRANSACTIONS,
      FilterExpression: "installmentGroup = :installmentGroup",
      ExpressionAttributeValues: {
        ":installmentGroup": installmentGroup,
      },
    })
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
    const items = await scanAll<Transaction>({
      TableName: TABLES.TRANSACTIONS,
      FilterExpression: "installmentGroup = :installmentGroup",
      ExpressionAttributeValues: {
        ":installmentGroup": installmentGroup,
      },
    })

    await batchDeleteByIds(
      TABLES.TRANSACTIONS,
      items.map((item) => item.id),
    )
  },

  async deleteByRecurringGroup(recurringGroup: string) {
    const items = await scanAll<Transaction>({
      TableName: TABLES.TRANSACTIONS,
      FilterExpression: "recurringGroup = :recurringGroup",
      ExpressionAttributeValues: {
        ":recurringGroup": recurringGroup,
      },
    })

    await batchDeleteByIds(
      TABLES.TRANSACTIONS,
      items.map((item) => item.id),
    )
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
    const items = await scanAll<Entry>({ TableName: TABLES.ENTRIES })
    return items.sort(byCreatedAtDesc)
  },

  async getByUserId(userId: string) {
    const items = await scanAll<Entry>({
      TableName: TABLES.ENTRIES,
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    })

    return items.sort(byCreatedAtDesc)
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
    return scanAll<PushToken>({
      TableName: TABLES.PUSH_TOKENS,
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: { ":userId": userId },
    })
  },

  async getByUserIds(userIds: string[]) {
    if (userIds.length === 0) return []

    const tokens = await scanAll<PushToken>({ TableName: TABLES.PUSH_TOKENS })
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
