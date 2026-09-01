import { userService } from "@/lib/dynamodb"
import { apiError, createAuthToken, handleOptions, json, readJson } from "@/lib/api-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** POST /api/v1/auth/login — autentica o aplicativo mobile e devolve um token. */
export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request)

  const email = body?.email?.trim()
  const password = body?.password

  if (!email || !password) {
    return apiError("Email e senha são obrigatórios")
  }

  try {
    const user = await userService.getByEmail(email)

    if (!user || user.password !== password) {
      return apiError("Email ou senha incorretos", 401)
    }

    if (user.status !== "active") {
      return apiError("Usuário inativo. Entre em contato com o administrador.", 403)
    }

    const publicUser = { id: user.id, email: user.email, name: user.name, role: user.role }
    const { token, expiresAt } = createAuthToken(publicUser)

    return json({ success: true, user: publicUser, token, expiresAt })
  } catch (error) {
    console.error("[api] erro no login:", error)
    return apiError("Erro interno do servidor", 500)
  }
}

export function OPTIONS() {
  return handleOptions()
}
