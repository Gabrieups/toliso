"use server"

import { userService } from "@/lib/dynamodb"
import { getCurrentUser } from "./auth"
import { revalidatePath } from "next/cache"

export async function createUserAction(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem criar usuários." }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as "admin" | "user"
  const status = formData.get("status") as "active" | "inactive"

  if (!name || !email || !password) {
    return { error: "Todos os campos são obrigatórios" }
  }

  try {
    // Verificar se email já existe
    const existingUser = await userService.getByEmail(email)
    if (existingUser) {
      return { error: "Email já está em uso" }
    }

    const newUser = await userService.create({
      name,
      email,
      password,
      role: role || "user",
      status: status || "active",
    })

    revalidatePath("/admin/users")
    return { success: true, user: newUser }
  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as "admin" | "user"
  const status = formData.get("status") as "active" | "inactive"

  try {
    await userService.update(userId, {
      name,
      email,
      role,
      status,
    })

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function deleteUserAction(userId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  if (currentUser.id === userId) {
    return { error: "Você não pode excluir sua própria conta" }
  }

  try {
    await userService.delete(userId)
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error("Erro ao excluir usuário:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function getUsersAction() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    const users = await userService.getAll()
    return { success: true, users }
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return { error: "Erro interno do servidor" }
  }
}
