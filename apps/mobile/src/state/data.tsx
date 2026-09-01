import AsyncStorage from "@react-native-async-storage/async-storage"
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { AppState } from "react-native"
import { ApiError } from "@/api/client"
import { dataApi, type AdminUser } from "@/api/endpoints"
import { useAuth } from "./auth"
import type { CreditCard, Entry, Invoice, PaymentBlock, Transaction } from "@toliso/core"

/**
 * Fonte de dados do aplicativo.
 *
 * Mantém uma cópia local (AsyncStorage) da última sincronização para que o app
 * abra instantaneamente e continue legível sem rede; a sincronização real roda
 * em seguida e substitui os dados. É o equivalente móvel do `SyncContext` da web.
 */

const CACHE_KEY = "@toliso/data-cache"
/** Evita ressincronizar a cada volta rápida ao app. */
const REFRESH_THROTTLE_MS = 30_000

interface DataSnapshot {
  transactions: Transaction[]
  entries: Entry[]
  cards: CreditCard[]
  invoices: Invoice[]
  paymentBlocks: PaymentBlock[]
  activeUsers: AdminUser[]
  syncedAt: string | null
}

const EMPTY: DataSnapshot = {
  transactions: [],
  entries: [],
  cards: [],
  invoices: [],
  paymentBlocks: [],
  activeUsers: [],
  syncedAt: null,
}

interface DataContextValue extends DataSnapshot {
  /** `true` apenas na primeira carga, quando ainda não há nada para mostrar. */
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  refresh: (options?: { silent?: boolean }) => Promise<void>
  /** Somente os cartões ativos — os únicos que aceitam novas despesas. */
  activeCards: CreditCard[]
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth()
  const [snapshot, setSnapshot] = useState<DataSnapshot>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastSyncRef = useRef(0)
  const inFlightRef = useRef(false)

  const cacheKey = user ? `${CACHE_KEY}:${user.id}` : CACHE_KEY

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!isAuthenticated || inFlightRef.current) return

      inFlightRef.current = true
      if (!silent) setIsSyncing(true)

      try {
        const [summary, invoices, users] = await Promise.all([
          dataApi.summary(),
          dataApi.invoices(),
          dataApi.activeUsers(),
        ])

        const next: DataSnapshot = {
          transactions: summary.transactions ?? [],
          entries: summary.entries ?? [],
          cards: summary.cards ?? [],
          invoices: invoices.invoices ?? [],
          paymentBlocks: invoices.paymentBlocks ?? [],
          activeUsers: users.users ?? [],
          syncedAt: summary.syncedAt,
        }

        setSnapshot(next)
        setError(null)
        lastSyncRef.current = Date.now()

        AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => undefined)
      } catch (caught) {
        if (caught instanceof ApiError && caught.isAuthError) {
          await logout()
          return
        }
        setError(caught instanceof Error ? caught.message : "Não foi possível sincronizar")
      } finally {
        inFlightRef.current = false
        setIsSyncing(false)
        setIsLoading(false)
      }
    },
    [isAuthenticated, cacheKey, logout],
  )

  // Carga inicial: mostra o cache imediatamente e sincroniza em seguida.
  useEffect(() => {
    if (!isAuthenticated) {
      setSnapshot(EMPTY)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    AsyncStorage.getItem(cacheKey)
      .then((cached) => {
        if (cancelled || !cached) return
        setSnapshot(JSON.parse(cached) as DataSnapshot)
        setIsLoading(false)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) refresh({ silent: true })
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, cacheKey, refresh])

  // Ressincroniza ao voltar para o app, respeitando o intervalo mínimo.
  useEffect(() => {
    if (!isAuthenticated) return

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return
      if (Date.now() - lastSyncRef.current < REFRESH_THROTTLE_MS) return
      refresh({ silent: true })
    })

    return () => subscription.remove()
  }, [isAuthenticated, refresh])

  const activeCards = useMemo(
    () => snapshot.cards.filter((card) => card.status === "active"),
    [snapshot.cards],
  )

  const value = useMemo<DataContextValue>(
    () => ({ ...snapshot, activeCards, isLoading, isSyncing, error, refresh }),
    [snapshot, activeCards, isLoading, isSyncing, error, refresh],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error("useData deve ser usado dentro de DataProvider")
  return context
}
