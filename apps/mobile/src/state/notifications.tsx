import * as Notifications from "expo-notifications"
import { useRouter } from "expo-router"
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Platform } from "react-native"
import { pushApi } from "@/api/endpoints"
import { useAuth } from "./auth"
import { useData } from "./data"
import {
  areNotificationsEnabled,
  registerForPush,
  scheduleInvoiceReminders,
  setNotificationsEnabled,
} from "@/utils/notifications"

/**
 * Liga as notificações ao ciclo de vida do app:
 *
 * - registra o token de push assim que há sessão;
 * - reagenda os lembretes locais a cada sincronização de faturas;
 * - abre a tela certa quando o usuário toca em uma notificação.
 */

interface NotificationsContextValue {
  enabled: boolean
  /** Token do Expo, ou `null` em emulador / sem permissão. */
  pushToken: string | null
  permission: Notifications.PermissionStatus | null
  scheduledCount: number
  setEnabled: (enabled: boolean) => Promise<void>
  /** Reaplica permissão + registro. Usado pelo botão de Ajustes. */
  reconnect: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { invoices } = useData()

  const [enabled, setEnabledState] = useState(true)
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null)
  const [scheduledCount, setScheduledCount] = useState(0)

  const registeredTokenRef = useRef<string | null>(null)

  useEffect(() => {
    areNotificationsEnabled().then(setEnabledState).catch(() => undefined)
  }, [])

  const connect = useCallback(async () => {
    if (!isAuthenticated) return

    const { token, status } = await registerForPush()
    setPermission(status)
    setPushToken(token)

    if (!token || registeredTokenRef.current === token) return

    try {
      await pushApi.register({
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        deviceName: Platform.OS,
      })
      registeredTokenRef.current = token
    } catch (error) {
      console.warn("[notificações] falha ao registrar o token no servidor:", error)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !enabled) return
    connect()
  }, [isAuthenticated, enabled, connect])

  // Reagenda os lembretes sempre que as faturas mudarem.
  useEffect(() => {
    if (!isAuthenticated || !enabled || invoices.length === 0) return

    scheduleInvoiceReminders(invoices)
      .then(setScheduledCount)
      .catch((error) => console.warn("[notificações] falha ao agendar lembretes:", error))
  }, [isAuthenticated, enabled, invoices])

  // Toque na notificação leva direto para a tela relacionada.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen

      if (typeof screen === "string" && screen.startsWith("/")) {
        router.push(screen as never)
      }
    })

    return () => subscription.remove()
  }, [router])

  const setEnabled = useCallback(
    async (next: boolean) => {
      setEnabledState(next)
      await setNotificationsEnabled(next)

      if (next) {
        await connect()
        return
      }

      setScheduledCount(0)

      if (pushToken) {
        pushApi.unregister(pushToken).catch(() => undefined)
        registeredTokenRef.current = null
      }
    },
    [connect, pushToken],
  )

  const value = useMemo<NotificationsContextValue>(
    () => ({ enabled, pushToken, permission, scheduledCount, setEnabled, reconnect: connect }),
    [enabled, pushToken, permission, scheduledCount, setEnabled, connect],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error("useNotifications deve ser usado dentro de NotificationsProvider")
  return context
}
