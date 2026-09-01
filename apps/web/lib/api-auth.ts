import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { userService } from "@/lib/dynamodb"
import type { PublicUser } from "@toliso/core"

/**
 * Autenticação da API REST `/api/v1` consumida pelo aplicativo mobile.
 *
 * A plataforma web continua usando o cookie `user-session` das Server Actions —
 * nada aqui altera esse fluxo. O mobile não tem cookies confiáveis, então usa um
 * token opaco assinado com HMAC-SHA256 e guardado no `expo-secure-store`.
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 dias, igual à sessão web

interface TokenPayload extends PublicUser {
  /** Emitido em (epoch segundos). */
  iat: number
  /** Expira em (epoch segundos). */
  exp: number
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET não configurado. Defina uma string aleatória de pelo menos 32 caracteres nas variáveis de ambiente.",
    )
  }
  return secret
}

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url")
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8")

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url")
}

/** Gera um token de sessão para o aplicativo mobile. */
export function createAuthToken(user: PublicUser): { token: string; expiresAt: string } {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }

  const body = encode(JSON.stringify(payload))
  return {
    token: `${body}.${sign(body)}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}

/** Valida a assinatura e a validade de um token. Retorna `null` se inválido. */
export function verifyAuthToken(token: string | null | undefined): TokenPayload | null {
  if (!token) return null

  const [body, signature] = token.split(".")
  if (!body || !signature) return null

  let expected: string
  try {
    expected = sign(body)
  } catch {
    return null
  }

  const received = Buffer.from(signature)
  const computed = Buffer.from(expected)
  if (received.length !== computed.length || !timingSafeEqual(received, computed)) {
    return null
  }

  try {
    const payload = JSON.parse(decode(body)) as TokenPayload
    if (!payload?.id || !payload.exp || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function extractToken(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim()
  }
  return null
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.API_ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
}

/** Resposta JSON de sucesso com cabeçalhos de CORS e sem cache. */
export function json<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
  })
}

/** Resposta JSON de erro no mesmo envelope usado pelas Server Actions. */
export function apiError(message: string, status = 400) {
  return json({ error: message }, status)
}

/** Handler de preflight, reutilizado por todas as rotas. */
export function handleOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export interface AuthContext {
  user: PublicUser
}

/**
 * Autentica a requisição e confirma que o usuário continua ativo no banco.
 * Retorna a resposta de erro pronta quando a autenticação falha.
 */
export async function authenticate(
  request: Request,
): Promise<{ ok: true; user: PublicUser } | { ok: false; response: NextResponse }> {
  const payload = verifyAuthToken(extractToken(request))

  if (!payload) {
    return { ok: false, response: apiError("Sessão inválida ou expirada", 401) }
  }

  const user = await userService.getById(payload.id)

  if (!user) {
    return { ok: false, response: apiError("Usuário não encontrado", 401) }
  }

  if (user.status !== "active") {
    return { ok: false, response: apiError("Usuário inativo. Entre em contato com o administrador.", 403) }
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }
}

/** Como `authenticate`, mas exige perfil de administrador. */
export async function authenticateAdmin(
  request: Request,
): Promise<{ ok: true; user: PublicUser } | { ok: false; response: NextResponse }> {
  const result = await authenticate(request)
  if (!result.ok) return result

  if (result.user.role !== "admin") {
    return { ok: false, response: apiError("Acesso negado. Apenas administradores.", 403) }
  }

  return result
}

/** Lê o corpo JSON da requisição sem lançar exceção. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
