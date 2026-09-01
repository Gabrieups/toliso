import * as SecureStore from "expo-secure-store"
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { ApiError, loadBaseUrl, setAuthToken } from "@/api/client"
import { authApi } from "@/api/endpoints"
import type { PublicUser } from "@toliso/core"

/**
 * Sessão do aplicativo.
 *
 * O token fica no `expo-secure-store` (Keystore no Android), nunca no
 * AsyncStorage. O usuário é guardado junto para que a interface apareça
 * preenchida antes mesmo da revalidação terminar.
 */

const TOKEN_KEY = "toliso.session.token"
const USER_KEY = "toliso.session.user"

interface AuthContextValue {
  user: PublicUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  /** `true` enquanto a sessão salva está sendo restaurada. */
  isRestoring: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Renova o token; devolve `false` se a sessão não vale mais. */
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  const persist = useCallback(async (nextUser: PublicUser, token: string) => {
    setAuthToken(token)
    setUser(nextUser)
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ])
  }, [])

  const clear = useCallback(async () => {
    setAuthToken(null)
    setUser(null)
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)])
  }, [])

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const result = await authApi.me()
      await persist(result.user, result.token)
      return true
    } catch (error) {
      // Só encerra a sessão quando o servidor diz que ela não vale mais.
      // Falha de rede não deve deslogar quem está sem sinal.
      if (error instanceof ApiError && error.isAuthError) {
        await clear()
        return false
      }
      return true
    }
  }, [persist, clear])

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        await loadBaseUrl()

        const [token, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ])

        if (cancelled) return

        if (!token || !storedUser) {
          setAuthToken(null)
          return
        }

        setAuthToken(token)
        setUser(JSON.parse(storedUser) as PublicUser)

        // Revalida em segundo plano: a UI já apareceu, sem tela de espera.
        await refresh()
      } catch {
        if (!cancelled) setAuthToken(null)
      } finally {
        if (!cancelled) setIsRestoring(false)
      }
    }

    restore()

    return () => {
      cancelled = true
    }
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password)
      await persist(result.user, result.token)
    },
    [persist],
  )

  const logout = useCallback(async () => {
    await clear()
  }, [clear])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === "admin",
      isRestoring,
      login,
      logout,
      refresh,
    }),
    [user, isRestoring, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return context
}
