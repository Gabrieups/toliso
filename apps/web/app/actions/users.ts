"use server"

import { getCurrentUser } from "./auth"
import { revalidatePath, unstable_noStore as noStore } from "next/cache"
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/operations/admin"
import { OperationError } from "@/lib/operations/transactions"
import type { EntityStatus, UserPayload, UserRole } from "@toliso/core"

/** Server Actions de usuários — adaptadores sobre `lib/operations/admin`. */

function toMessage(error: unknown, fallback: string) {
  if (error instanceof OperationError) return error.message
  console.error(fallback, error)
  return "Erro interno do servidor"
}

function readUserPayload(formData: FormData): UserPayload {
  return {
    name: (formData.get("name") as string) || "",
    email: (formData.get("email") as string) || "",
    password: (formData.get("password") as string) || undefined,
    role: (formData.get("role") as UserRole) || "user",
    status: (formData.get("status") as EntityStatus) || "active",
  }
}

export async function createUserAction(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem criar usuários." }
  }

  try {
    const user = await createUser(readUserPayload(formData))
    revalidatePath("/admin/users")
    return { success: true as const, user }
  } catch (error) {
    return { error: toMessage(error, "Erro ao criar usuário:") }
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    await updateUser(userId, readUserPayload(formData))
    revalidatePath("/admin/users")
    return { success: true as const }
  } catch (error) {
    return { error: toMessage(error, "Erro ao atualizar usuário:") }
  }
}

export async function deleteUserAction(userId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    await deleteUser(currentUser, userId)
    revalidatePath("/admin/users")
    return { success: true as const }
  } catch (error) {
    return { error: toMessage(error, "Erro ao excluir usuário:") }
  }
}

export async function getUsersAction() {
  noStore()
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    const users = await listUsers()
    return { success: true as const, users }
  } catch (error) {
    return { error: toMessage(error, "Erro ao buscar usuários:") }
  }
}
