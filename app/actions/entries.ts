"use server"

import { entryService } from "@/lib/dynamodb"
import { getCurrentUser } from "./auth"
import { revalidatePath } from "next/cache"

export async function createEntryAction(formData: FormData, targetUserId?: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const amount = Number(formData.get("amount"))

  if (!title || !amount) {
    return { error: "Título e valor são obrigatórios" }
  }

  if (amount <= 0) {
    return { error: "O valor deve ser maior que zero" }
  }

  let userId = currentUser.id
  let userName = currentUser.name
  let userEmail = currentUser.email

  if (currentUser.role === "admin" && targetUserId) {
    const { userService } = await import("@/lib/dynamodb")
    const users = await userService.getAll()
    const targetUser = users.find((u) => u.id === targetUserId)

    if (targetUser) {
      userId = targetUser.id
      userName = targetUser.name
      userEmail = targetUser.email
    }
  }

  try {
    const newEntry = await entryService.create({
      userId,
      userName,
      userEmail,
      title,
      description: description || "",
      amount,
      date: new Date().toISOString(),
    })

    revalidatePath("/dashboard")
    revalidatePath("/invoices")
    return { success: true, entry: newEntry }
  } catch (error) {
    console.error("Erro ao criar entrada:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function deleteEntryAction(entryId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    await entryService.delete(entryId)
    revalidatePath("/dashboard")
    revalidatePath("/invoices")
    return { success: true }
  } catch (error) {
    console.error("Erro ao excluir entrada:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function getEntriesAction() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    let entries
    if (currentUser.role === "admin") {
      entries = await entryService.getAll()
    } else {
      entries = await entryService.getByUserId(currentUser.id)
    }

    return { success: true, entries }
  } catch (error) {
    console.error("Erro ao buscar entradas:", error)
    return { error: "Erro interno do servidor" }
  }
}
