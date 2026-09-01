import Constants from "expo-constants"

/**
 * Cliente HTTP da API `/api/v1` servida pela plataforma web.
 *
 * A URL base vem de `app.json` (`extra.apiUrl`) e sempre aponta para a
 * instalação de produção — o app não permite trocar de servidor em tempo de
 * execução.
 */

const REQUEST_TIMEOUT_MS = 20000

function defaultBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl
  return (configured ?? "http://localhost:3000").replace(/\/+$/, "")
}

const baseUrl = defaultBaseUrl()
let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

/** Erro de API com o status HTTP preservado. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }

  /** Sessão inválida/expirada — o app deve voltar para o login. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  /** Envia a requisição sem o cabeçalho de autorização (usado no login). */
  anonymous?: boolean
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, anonymous = false, signal } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  // Encadeia um sinal externo (ex.: tela desmontada) com o do timeout.
  signal?.addEventListener("abort", () => controller.abort(), { once: true })

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(!anonymous && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const text = await response.text()
    let payload: unknown = null

    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        // Resposta não-JSON (ex.: página de erro do proxy).
        throw new ApiError("Resposta inesperada do servidor", response.status)
      }
    }

    if (!response.ok) {
      const message = (payload as { error?: string } | null)?.error ?? "Não foi possível concluir a operação"
      throw new ApiError(message, response.status)
    }

    return payload as T
  } catch (error) {
    if (error instanceof ApiError) throw error

    if ((error as Error)?.name === "AbortError") {
      throw new ApiError("O servidor demorou demais para responder", 408)
    }

    throw new ApiError("Sem conexão com o servidor. Verifique sua internet.", 0)
  } finally {
    clearTimeout(timeout)
  }
}
