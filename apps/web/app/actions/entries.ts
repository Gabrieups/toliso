"use server"

import { getCurrentUser } from "./auth"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { createEntry, deleteEntry, listEntries } from "@/lib/operations/entries"
import { OperationError } from "@/lib/operations/transactions"
import { parseAmount } from "@toliso/core"

/** Server Actions de pagamentos — adaptadores sobre `lib/operations/entries`. */

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

export async function createEntryAction(formData: FormData, targetUserId?: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const entry = await createEntry(currentUser, {
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      amount: parseAmount((formData.get("amount") as string) || ""),
      targetUserId,
    })

    revalidateAll()
    return { success: true as const, entry }
  } catch (error) {
    return { error: toMessage(error, "Erro ao criar entrada:") }
  }
}

export async function deleteEntryAction(entryId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    await deleteEntry(entryId)
    revalidateAll()
    return { success: true as const }
  } catch (error) {
    return { error: toMessage(error, "Erro ao excluir entrada:") }
  }
}

export async function getEntriesAction() {
  noStore()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const entries = await listEntries(currentUser)
    return { success: true as const, entries }
  } catch (error) {
    return { error: toMessage(error, "Erro ao buscar entradas:") }
  }
}
