/**
 * Contrato da API REST `/api/v1` — servida pela plataforma web e consumida
 * pelo aplicativo mobile. Manter os caminhos aqui evita divergencia de strings
 * entre cliente e servidor.
 */

export const API_VERSION = "v1"
export const API_PREFIX = `/api/${API_VERSION}` as const

export const API_ROUTES = {
  login: `${API_PREFIX}/auth/login`,
  me: `${API_PREFIX}/auth/me`,
  logout: `${API_PREFIX}/auth/logout`,
  transactions: `${API_PREFIX}/transactions`,
  transaction: (id: string) => `${API_PREFIX}/transactions/${id}`,
  entries: `${API_PREFIX}/entries`,
  entry: (id: string) => `${API_PREFIX}/entries/${id}`,
  cards: `${API_PREFIX}/cards`,
  card: (id: string) => `${API_PREFIX}/cards/${id}`,
  users: `${API_PREFIX}/users`,
  user: (id: string) => `${API_PREFIX}/users/${id}`,
  activeUsers: `${API_PREFIX}/users/active`,
  invoices: `${API_PREFIX}/invoices`,
  summary: `${API_PREFIX}/summary`,
  pushRegister: `${API_PREFIX}/push/register`,
  pushUnregister: `${API_PREFIX}/push/unregister`,
  pushTest: `${API_PREFIX}/push/test`,
  report: `${API_PREFIX}/reports/send`,
} as const

/** Cabecalho usado para transportar o token de sessao do mobile. */
export const AUTH_HEADER = "authorization"

/** Payload aceito por `POST /api/v1/transactions`. */
export interface CreateTransactionPayload {
  title: string
  description?: string
  amount: number
  card: string
  installments?: number
  isShared?: boolean
  isRecurring?: boolean
  divisionType?: "equal" | "custom"
  sharedUserIds?: string[]
  customShares?: Array<{ userId: string; userName: string; amount: string }>
  targetUserId?: string
  customDate?: string
}

/** Payload aceito por `PATCH /api/v1/transactions/:id`. */
export interface UpdateTransactionPayload {
  title: string
  description?: string
  amount: number
  card: string
  date?: string
  targetUserId?: string
}

/** Payload aceito por `POST /api/v1/entries`. */
export interface CreateEntryPayload {
  title: string
  description?: string
  amount: number
  targetUserId?: string
}

/** Payload aceito por `POST` e `PATCH` de `/api/v1/cards`. */
export interface CardPayload {
  name: string
  bank: string
  type: "visa" | "mastercard" | "elo" | "american-express"
  color: string
  status?: "active" | "inactive"
  dueDate?: number
  closingDate?: number
}

/** Payload aceito por `POST` e `PATCH` de `/api/v1/users`. */
export interface UserPayload {
  name: string
  email: string
  password?: string
  role?: "admin" | "user"
  status?: "active" | "inactive"
}

/** Payload aceito por `POST /api/v1/push/register`. */
export interface RegisterPushPayload {
  token: string
  platform: "android" | "ios" | "web"
  deviceName?: string
}

/** Payload aceito por `POST /api/v1/reports/send`. */
export interface SendReportPayload {
  userId: string
  /** Periodo `YYYY-MM`. Sem isso, usa o periodo vigente. */
  period?: string
}
