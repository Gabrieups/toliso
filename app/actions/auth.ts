"use server"

import { userService } from "@/lib/dynamodb"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email e senha são obrigatórios" }
  }

  try {
    const user = await userService.getByEmail(email)

    if (!user || user.password !== password) {
      return { error: "Email ou senha incorretos" }
    }

    if (user.status !== "active") {
      return { error: "Usuário inativo. Entre em contato com o administrador." }
    }

    // Criar sessão com todos os dados do usuário
    const cookieStore = await cookies()
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    cookieStore.set("user-session", JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    })

    console.log("Usuário logado:", userData) // Para debug

    return { success: true, user: userData }
  } catch (error) {
    console.error("Erro no login:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete("user-session")
  redirect("/")
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("user-session")

    if (!sessionCookie) {
      return null
    }

    const session = JSON.parse(sessionCookie.value)
    return session
  } catch (error) {
    return null
  }
}
