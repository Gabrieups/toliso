"use server"

import { cardService } from "@/lib/dynamodb"
import { getCurrentUser } from "./auth"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"

export async function createCardAction(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem criar cartões." }
  }

  const name = formData.get("name") as string
  const bank = formData.get("bank") as string
  const type = formData.get("type") as "visa" | "mastercard" | "elo" | "american-express"
  const color = formData.get("color") as string
  const status = formData.get("status") as "active" | "inactive"
  const dueDate = Number(formData.get("dueDate"))
  const closingDate = Number(formData.get("closingDate"))

  if (!name || !bank || !type || !color) {
    return { error: "Todos os campos obrigatórios devem ser preenchidos" }
  }

  try {
    const newCard = await cardService.create({
      name,
      bank,
      type,
      color,
      status: status || "active",
      dueDate: dueDate || 10,
      closingDate: closingDate || 5,
    })

    revalidatePath("/admin/cards")
    return { success: true, card: newCard }
  } catch (error) {
    console.error("Erro ao criar cartão:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function updateCardAction(cardId: string, formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  const name = formData.get("name") as string
  const bank = formData.get("bank") as string
  const type = formData.get("type") as "visa" | "mastercard" | "elo" | "american-express"
  const color = formData.get("color") as string
  const status = formData.get("status") as "active" | "inactive"
  const dueDate = Number(formData.get("dueDate"))
  const closingDate = Number(formData.get("closingDate"))

  try {
    await cardService.update(cardId, {
      name,
      bank,
      type,
      color,
      status,
      dueDate,
      closingDate,
    })

    revalidatePath("/admin/cards")
    return { success: true }
  } catch (error) {
    console.error("Erro ao atualizar cartão:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function deleteCardAction(cardId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    await cardService.delete(cardId)
    revalidatePath("/admin/cards")
    return { success: true }
  } catch (error) {
    console.error("Erro ao excluir cartão:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function getCardsAction() {
  noStore()
  try {
    const cards = await cardService.getAll()
    return { success: true, cards }
  } catch (error) {
    console.error("Erro ao buscar cartões:", error)
    return { error: "Erro interno do servidor" }
  }
}
