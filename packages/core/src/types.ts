/**
 * Modelos de dominio compartilhados entre a plataforma web (Next.js) e o
 * aplicativo mobile (Expo). Refletem exatamente as tabelas do DynamoDB.
 */

export type UserRole = "admin" | "user"
export type EntityStatus = "active" | "inactive"
export type CardBrand = "visa" | "mastercard" | "elo" | "american-express"
export type DivisionType = "equal" | "custom"

export interface User {
  id: string
  email: string
  name: string
  password: string
  role: UserRole
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

/** Usuario sem dados sensiveis — formato usado em sessoes e respostas de API. */
export interface PublicUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface CreditCard {
  id: string
  name: string
  bank: string
  type: CardBrand
  color: string
  status: EntityStatus
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
  // Parcelamento
  isInstallment: boolean
  totalInstallments?: number
  currentInstallment?: number
  installmentGroup?: string
  // Divisao entre usuarios
  isShared: boolean
  divisionType?: DivisionType
  sharedWith?: string[]
  sharedUserNames?: string[]
  // Recorrencia
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
  cardType: CardBrand
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

/** Token de push do Expo registrado por um dispositivo. */
export interface PushToken {
  token: string
  userId: string
  userEmail: string
  platform: "android" | "ios" | "web"
  deviceName?: string
  createdAt: string
  updatedAt: string
}

export interface UserExpenseSummary {
  id: string
  totalExpenses: number
  totalPayments: number
  balance: number
}

/** Envelope padrao das respostas da API REST consumida pelo mobile. */
export type ApiResult<T> = ({ success: true } & T) | { success?: false; error: string }
