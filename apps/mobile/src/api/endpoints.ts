import { request } from "./client"
import {
  API_ROUTES,
  type CardPayload,
  type CreateEntryPayload,
  type CreateTransactionPayload,
  type CreditCard,
  type Entry,
  type Invoice,
  type PaymentBlock,
  type PublicUser,
  type RegisterPushPayload,
  type SendReportPayload,
  type Transaction,
  type UpdateTransactionPayload,
  type UserPayload,
} from "@toliso/core"

/** Funções tipadas para cada rota da API. Uma camada fina sobre `request`. */

export type AdminUser = PublicUser & { status: "active" | "inactive"; createdAt: string }

export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: true; user: PublicUser; token: string; expiresAt: string }>(API_ROUTES.login, {
      method: "POST",
      body: { email, password },
      anonymous: true,
    }),

  /** Revalida a sessão e devolve um token renovado (sessão deslizante). */
  me: () => request<{ success: true; user: PublicUser; token: string; expiresAt: string }>(API_ROUTES.me),
}

export const dataApi = {
  /** Carga inicial completa em uma única requisição. */
  summary: () =>
    request<{
      success: true
      user: PublicUser
      transactions: Transaction[]
      entries: Entry[]
      cards: CreditCard[]
      syncedAt: string
    }>(API_ROUTES.summary),

  invoices: () =>
    request<{ success: true; invoices: Invoice[]; paymentBlocks: PaymentBlock[] }>(API_ROUTES.invoices),

  activeUsers: () => request<{ success: true; users: AdminUser[] }>(API_ROUTES.activeUsers),
}

export const transactionsApi = {
  create: (payload: CreateTransactionPayload) =>
    request<{ success: true; transactions: Transaction[]; message: string }>(API_ROUTES.transactions, {
      method: "POST",
      body: payload,
    }),

  update: (id: string, payload: UpdateTransactionPayload) =>
    request<{ success: true; message: string }>(API_ROUTES.transaction(id), {
      method: "PATCH",
      body: payload,
    }),

  remove: (id: string) => request<{ success: true }>(API_ROUTES.transaction(id), { method: "DELETE" }),
}

export const entriesApi = {
  create: (payload: CreateEntryPayload) =>
    request<{ success: true; entry: Entry }>(API_ROUTES.entries, { method: "POST", body: payload }),

  remove: (id: string) => request<{ success: true }>(API_ROUTES.entry(id), { method: "DELETE" }),
}

export const cardsApi = {
  list: () => request<{ success: true; cards: CreditCard[] }>(API_ROUTES.cards),

  create: (payload: CardPayload) =>
    request<{ success: true; card: CreditCard }>(API_ROUTES.cards, { method: "POST", body: payload }),

  update: (id: string, payload: CardPayload) =>
    request<{ success: true }>(API_ROUTES.card(id), { method: "PATCH", body: payload }),

  remove: (id: string) => request<{ success: true }>(API_ROUTES.card(id), { method: "DELETE" }),
}

export const usersApi = {
  list: () => request<{ success: true; users: AdminUser[] }>(API_ROUTES.users),

  create: (payload: UserPayload) =>
    request<{ success: true; user: AdminUser }>(API_ROUTES.users, { method: "POST", body: payload }),

  update: (id: string, payload: UserPayload) =>
    request<{ success: true }>(API_ROUTES.user(id), { method: "PATCH", body: payload }),

  remove: (id: string) => request<{ success: true }>(API_ROUTES.user(id), { method: "DELETE" }),
}

export const reportsApi = {
  /** Envia por e-mail o relatório de gastos do usuário no período informado. */
  send: (payload: SendReportPayload) =>
    request<{ success: true; message: string }>(API_ROUTES.report, { method: "POST", body: payload }),
}

export const pushApi = {
  register: (payload: RegisterPushPayload) =>
    request<{ success: true; warning?: string }>(API_ROUTES.pushRegister, { method: "POST", body: payload }),

  unregister: (token: string) =>
    request<{ success: true }>(API_ROUTES.pushUnregister, { method: "POST", body: { token } }),

  test: () => request<{ success: true; delivered: number }>(API_ROUTES.pushTest, { method: "POST" }),
}
