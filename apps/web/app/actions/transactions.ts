"use server"

import { userService } from "@/lib/dynamodb"
import { getCurrentUser } from "./auth"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import {
  OperationError,
  createTransaction,
  deleteTransaction,
  editTransaction,
  listTransactions,
} from "@/lib/operations/transactions"
import { toPublicUser } from "@/lib/operations/admin"
import { parseAmount, type CreateTransactionPayload } from "@toliso/core"

/**
 * Server Actions de despesas.
 *
 * São adaptadores finos: convertem `FormData` em payload e delegam para
 * `lib/operations/transactions`, o mesmo módulo usado pelas rotas REST que
 * atendem o aplicativo mobile.
 */

function revalidateAll() {
  revalidatePath("/")
  revalidatePath("/dashboard")
  revalidatePath("/invoices")
}

function toMessage(error: unknown, fallback: string) {
  if (error instanceof OperationError) return error.message
  console.error(fallback, error)
  return "Erro interno do servidor"
}

export async function createTransactionAction(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  const sharedUserIdsRaw = formData.get("sharedUserIds") as string | null
  const customSharesRaw = formData.get("customShares") as string | null
  const targetUserId = formData.get("targetUserId") as string | null

  const payload: CreateTransactionPayload = {
    title: (formData.get("title") as string) || "",
    description: (formData.get("description") as string) || "",
    amount: parseAmount((formData.get("amount") as string) || ""),
    card: (formData.get("card") as string) || "",
    installments: Number(formData.get("installments")) || 1,
    isShared: formData.get("isShared") === "true",
    isRecurring: formData.get("isRecurring") === "true",
    divisionType: (formData.get("divisionType") as "equal" | "custom") || "equal",
    sharedUserIds: sharedUserIdsRaw ? JSON.parse(sharedUserIdsRaw) : [],
    customShares: customSharesRaw ? JSON.parse(customSharesRaw) : [],
    targetUserId: targetUserId && targetUserId !== "self" ? targetUserId : undefined,
    customDate: (formData.get("customDate") as string) || undefined,
  }

  try {
    const result = await createTransaction(currentUser, payload)
    revalidateAll()

    return {
      success: true as const,
      transactions: result.transactions,
      message: result.message,
    }
  } catch (error) {
    return { error: toMessage(error, "Erro ao criar transação:") }
  }
}

export async function deleteTransactionAction(transactionId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    await deleteTransaction(transactionId)
    revalidateAll()
    return { success: true as const }
  } catch (error) {
    return { error: toMessage(error, "Erro ao excluir transação:") }
  }
}

export async function editTransactionAction(transactionId: string, formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Apenas administradores podem editar transações" }
  }

  try {
    const result = await editTransaction(transactionId, {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      amount: parseAmount((formData.get("amount") as string) || ""),
      card: (formData.get("card") as string) || "",
      date: (formData.get("date") as string) || undefined,
      targetUserId: (formData.get("targetUserId") as string) || undefined,
    })

    revalidateAll()
    return { success: true as const, message: result.message }
  } catch (error) {
    return { error: toMessage(error, "Erro ao editar transação:") }
  }
}

export async function getTransactionsAction() {
  noStore()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const transactions = await listTransactions(currentUser)
    return { success: true as const, transactions }
  } catch (error) {
    return { error: toMessage(error, "Erro ao buscar transações:") }
  }
}

export async function getActiveUsersAction() {
  noStore()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const users = await userService.getActiveUsers()
    return { success: true as const, users: users.map(toPublicUser) }
  } catch (error) {
    return { error: toMessage(error, "Erro ao buscar usuários ativos:") }
  }
}
