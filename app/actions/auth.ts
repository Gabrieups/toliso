"use server"

import { userService } from "@/lib/dynamodb"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const SESSION_COOKIE_NAME = "user-session"
// Duração da sessão: 30 dias. A sessão é deslizante (rolling), ou seja,
// é renovada a cada verificação de auth enquanto o usuário estiver ativo.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
}

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

    cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(userData), SESSION_COOKIE_OPTIONS)

    return { success: true, user: userData }
  } catch (error) {
    console.error("Erro no login:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect("/")
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie) {
      return null
    }

    const session = JSON.parse(sessionCookie.value)
    return session
  } catch (error) {
    return null
  }
}

// Renova (estende) a validade do cookie de sessão sem alterar seus dados.
// Usado para implementar sessão deslizante: enquanto o usuário estiver ativo,
// a sessão nunca expira.
export async function refreshSession() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie) {
      return null
    }

    const session = JSON.parse(sessionCookie.value)
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie.value, SESSION_COOKIE_OPTIONS)
    return session
  } catch (error) {
    return null
  }
}
