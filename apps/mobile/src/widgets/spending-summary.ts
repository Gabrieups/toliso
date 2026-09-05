import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"
import { setAuthToken } from "@/api/client"
import { dataApi } from "@/api/endpoints"
import { getCurrentPeriod, getPeriodDisplay, isInPeriod, sumAmount } from "@toliso/core"
import type { Entry, Transaction } from "@toliso/core"

/**
 * Resumo do período mostrado no widget de tela inicial do Android.
 *
 * Mesma conta feita em `app/(tabs)/home.tsx` (meus gastos / meus pagamentos /
 * quanto falta), só que fora do React — precisa rodar tanto no app quanto na
 * tarefa headless que atualiza o widget em segundo plano.
 */

const TOKEN_KEY = "toliso.session.token"
const WIDGET_CACHE_KEY = "@toliso/widget-spending-summary"

export interface SpendingSummary {
  totalExpenses: number
  totalPayments: number
  remaining: number
  periodLabel: string
  updatedAt: string
}

export function computeSpendingSummary(
  transactions: Transaction[],
  entries: Entry[],
  userEmail: string,
): SpendingSummary {
  const period = getCurrentPeriod()

  const myTransactions = transactions.filter((t) => t.userEmail === userEmail && isInPeriod(t.date, period))
  const myEntries = entries.filter((e) => e.userEmail === userEmail && isInPeriod(e.date, period))

  const totalExpenses = sumAmount(myTransactions)
  const totalPayments = sumAmount(myEntries)

  return {
    totalExpenses,
    totalPayments,
    remaining: Math.max(totalExpenses - totalPayments, 0),
    periodLabel: getPeriodDisplay(period, { includeRange: false }),
    updatedAt: new Date().toISOString(),
  }
}

export async function cacheSpendingSummary(summary: SpendingSummary): Promise<void> {
  await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(summary))
}

export async function readCachedSpendingSummary(): Promise<SpendingSummary | null> {
  const raw = await AsyncStorage.getItem(WIDGET_CACHE_KEY)
  return raw ? (JSON.parse(raw) as SpendingSummary) : null
}

/**
 * Busca dados frescos na API — usado pela tarefa headless do widget, que roda
 * sem o app aberto e portanto sem o `AuthProvider` para colocar o token no
 * cliente HTTP.
 */
export async function fetchSpendingSummary(): Promise<SpendingSummary | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (!token) return null

  setAuthToken(token)
  const summary = await dataApi.summary()

  const result = computeSpendingSummary(summary.transactions ?? [], summary.entries ?? [], summary.user.email)
  await cacheSpendingSummary(result)
  return result
}

/** Busca fresco; se falhar (sem sessão, sem rede), cai para o último valor salvo. */
export async function readSpendingSummaryWithFallback(): Promise<SpendingSummary | null> {
  try {
    const fresh = await fetchSpendingSummary()
    if (fresh) return fresh
  } catch {
    // segue para o cache
  }

  return readCachedSpendingSummary()
}
