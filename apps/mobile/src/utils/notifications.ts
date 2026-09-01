import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import {
  getInvoiceClosingDate,
  getInvoiceDueDate,
  invoiceClosingNotification,
  invoiceDueNotification,
  type Invoice,
} from "@toliso/core"

/**
 * Notificações do aplicativo.
 *
 * São duas fontes complementares:
 *
 * 1. **Push** (servidor → aparelho): avisa quando alguém divide uma despesa
 *    com você, lança algo na sua conta ou registra um pagamento.
 * 2. **Locais agendadas** (no próprio aparelho): lembretes de fechamento e
 *    vencimento de cada fatura. Funcionam mesmo sem servidor e sem internet.
 */

const PREF_KEY = "@toliso/notifications-enabled"
const ANDROID_CHANNEL = "default"

/** Notificação recebida com o app aberto continua aparecendo na bandeja. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function areNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(PREF_KEY)
  // Sem preferência salva, o padrão é ligado — o usuário instalou o app
  // justamente para acompanhar os gastos.
  return stored === null ? true : stored === "true"
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, String(enabled))
  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }
}

/** Cria o canal do Android — obrigatório para som e prioridade alta. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: "Avisos do To Liso",
    description: "Despesas compartilhadas, pagamentos e lembretes de fatura",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2ECC71",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
}

export interface PushRegistration {
  token: string | null
  status: Notifications.PermissionStatus
}

/**
 * Pede permissão e devolve o token de push do Expo.
 *
 * Em emulador/simulador não há token — o app segue funcionando, apenas sem
 * notificações vindas do servidor.
 */
export async function registerForPush(): Promise<PushRegistration> {
  await ensureAndroidChannel()

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }

  if (status !== "granted" || !Device.isDevice) {
    return { token: null, status }
  }

  try {
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId

    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    return { token: result.data, status }
  } catch (error) {
    console.warn("[notificações] não foi possível obter o token de push:", error)
    return { token: null, status }
  }
}

/** Quantos dias antes do evento cada lembrete dispara. */
const CLOSING_REMINDER_DAYS = [3, 1]
const DUE_REMINDER_DAYS = [3, 1, 0]

/**
 * Reagenda todos os lembretes locais de fatura.
 *
 * Sempre cancela antes de agendar: as faturas mudam a cada sincronização e
 * lembretes obsoletos seriam pior que lembrete nenhum.
 */
export async function scheduleInvoiceReminders(invoices: Invoice[]): Promise<number> {
  if (!(await areNotificationsEnabled())) return 0

  const permission = await Notifications.getPermissionsAsync()
  if (permission.status !== "granted") return 0

  await Notifications.cancelAllScheduledNotificationsAsync()
  await ensureAndroidChannel()

  const now = Date.now()
  let scheduled = 0

  // Só faturas em aberto do período corrente em diante interessam.
  const pending = invoices.filter((invoice) => invoice.balance > 0.005)

  for (const invoice of pending) {
    const dueDate = getInvoiceDueDate(invoice.period, invoice.dueDate)
    const closingDate = getInvoiceClosingDate(invoice.period, invoice.closingDate)

    for (const daysAhead of DUE_REMINDER_DAYS) {
      const triggerAt = new Date(dueDate)
      triggerAt.setDate(triggerAt.getDate() - daysAhead)
      triggerAt.setHours(9, 0, 0, 0)

      if (triggerAt.getTime() <= now) continue

      const content = invoiceDueNotification({
        cardName: invoice.cardName,
        period: invoice.period,
        balance: invoice.balance,
        daysAhead,
      })

      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data,
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerAt,
          channelId: ANDROID_CHANNEL,
        },
      })

      scheduled += 1
    }

    for (const daysAhead of CLOSING_REMINDER_DAYS) {
      const triggerAt = new Date(closingDate)
      triggerAt.setDate(triggerAt.getDate() - daysAhead)
      triggerAt.setHours(9, 0, 0, 0)

      if (triggerAt.getTime() <= now) continue

      const content = invoiceClosingNotification({
        cardName: invoice.cardName,
        period: invoice.period,
        total: invoice.totalExpenses,
        daysAhead,
      })

      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data,
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerAt,
          channelId: ANDROID_CHANNEL,
        },
      })

      scheduled += 1
    }
  }

  return scheduled
}

/** Dispara uma notificação local imediata — usado no teste da tela de Ajustes. */
export async function sendLocalTestNotification(): Promise<void> {
  await ensureAndroidChannel()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Notificações ativas",
      body: "Você vai receber avisos de despesas compartilhadas e lembretes de fatura.",
      sound: "default",
    },
    trigger: null,
  })
}

/** Quantidade de lembretes atualmente agendados no aparelho. */
export async function countScheduledReminders(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  return scheduled.length
}
