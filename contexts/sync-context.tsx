"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"

interface SyncContextType {
  isSyncing: boolean
  syncAll: () => void
  registerSyncCallback: (key: string, cb: () => Promise<void>) => void
  unregisterSyncCallback: (key: string) => void
}

const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const callbacks = useRef<Record<string, () => Promise<void>>>({})

  const registerSyncCallback = useCallback((key: string, cb: () => Promise<void>) => {
    callbacks.current[key] = cb
  }, [])

  const unregisterSyncCallback = useCallback((key: string) => {
    delete callbacks.current[key]
  }, [])

  const syncAll = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const all = Object.values(callbacks.current)
      await Promise.all(all.map((cb) => cb()))
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  return (
    <SyncContext.Provider value={{ isSyncing, syncAll, registerSyncCallback, unregisterSyncCallback }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncContext() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error("useSyncContext deve ser usado dentro de SyncProvider")
  return ctx
}
