import { authenticate, createAuthToken, handleOptions, json } from "@/lib/api-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/v1/auth/me — valida a sessão do aplicativo e devolve um token
 * renovado (sessão deslizante, igual ao comportamento da web).
 */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const { token, expiresAt } = createAuthToken(auth.user)

  return json({ success: true, user: auth.user, token, expiresAt })
}

export function OPTIONS() {
  return handleOptions()
}
