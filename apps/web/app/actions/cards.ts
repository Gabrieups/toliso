"use server"

import { getCurrentUser } from "./auth"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { createCard, deleteCard, listCards, updateCard } from "@/lib/operations/admin"
import { OperationError } from "@/lib/operations/transactions"
import type { CardBrand, CardPayload, EntityStatus } from "@toliso/core"

/** Server Actions de cartões — adaptadores sobre `lib/operations/admin`. */

function toMessage(error: unknown, fallback: string) {
  if (error instanceof OperationError) return error.message
  console.error(fallback, error)
  return "Erro interno do servidor"
}

function readCardPayload(formData: FormData): CardPayload {
  return {
    name: (formData.get("name") as string) || "",
    bank: (formData.get("bank") as string) || "",
    type: formData.get("type") as CardBrand,
    color: (formData.get("color") as string) || "",
    status: (formData.get("status") as EntityStatus) || "active",
    dueDate: Number(formData.get("dueDate")) || 10,
    closingDate: Number(formData.get("closingDate")) || 5,
  }
}

export async function createCardAction(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem criar cartões." }
  }

  try {
    const card = await createCard(readCardPayload(formData))
    revalidatePath("/admin/cards")
    return { success: true as const, card }
  } catch (error) {
    return { error: toMessage(error, "Erro ao criar cartão:") }
  }
}

export async function updateCardAction(cardId: string, formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    await updateCard(cardId, readCardPayload(formData))
    revalidatePath("/admin/cards")
    return { success: true as const }
  } catch (error) {
    return { error: toMessage(error, "Erro ao atualizar cartão:") }
  }
}

export async function deleteCardAction(cardId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    await deleteCard(cardId)
    revalidatePath("/admin/cards")
    return { success: true as const }
  } catch (error) {
    return { error: toMessage(error, "Erro ao excluir cartão:") }
  }
}

export async function getCardsAction() {
  noStore()
  try {
    const cards = await listCards()
    return { success: true as const, cards }
  } catch (error) {
    return { error: toMessage(error, "Erro ao buscar cartões:") }
  }
}
