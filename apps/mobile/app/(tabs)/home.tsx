import React, { useMemo, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { transactionsApi, entriesApi } from "@/api/endpoints"
import { ApiError } from "@/api/client"
import { ActionFab } from "@/components/ActionFab"
import { useAlert } from "@/components/AlertProvider"
import { Banner, EmptyState, Loading } from "@/components/Feedback"
import { EntrySheet } from "@/components/forms/EntrySheet"
import { ExpenseSheet } from "@/components/forms/ExpenseSheet"
import { EntryRow, TransactionRow } from "@/components/MovementRow"
import { PageHeader } from "@/components/PageHeader"
import { PeriodNavigator } from "@/components/PeriodNavigator"
import { Segmented } from "@/components/Segmented"
import { StatCard } from "@/components/StatCard"
import { Text } from "@/components/Text"
import { usePeriodNavigation } from "@/hooks/usePeriodNavigation"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { useTheme } from "@/theme/ThemeProvider"
import { spacing } from "@/theme/tokens"
import { formatCurrency, isInPeriod, sumAmount, type CardBrand } from "@toliso/core"

type Tab = "expenses" | "payments"

/**
 * Tela inicial: o resumo pessoal do período — o que eu gastei, o que eu paguei
 * e a lista das minhas movimentações.
 */
export default function HomeScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const alert = useAlert()
  const { user } = useAuth()
  const { transactions, entries, cards, activeCards, isLoading, isSyncing, refresh } = useData()

  const [tab, setTab] = useState<Tab>("expenses")
  const [isExpenseOpen, setExpenseOpen] = useState(false)
  const [isEntryOpen, setEntryOpen] = useState(false)

  // Na Home cada pessoa vê apenas o que é dela — inclusive o admin.
  const myTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.userEmail === user?.email),
    [transactions, user?.email],
  )
  const myEntries = useMemo(
    () => entries.filter((entry) => entry.userEmail === user?.email),
    [entries, user?.email],
  )

  const period = usePeriodNavigation([...myTransactions, ...myEntries])

  const periodTransactions = useMemo(
    () => myTransactions.filter((transaction) => isInPeriod(transaction.date, period.selected)),
    [myTransactions, period.selected],
  )
  const periodEntries = useMemo(
    () => myEntries.filter((entry) => isInPeriod(entry.date, period.selected)),
    [myEntries, period.selected],
  )

  const totalExpenses = sumAmount(periodTransactions)
  const totalPayments = sumAmount(periodEntries)
  const balance = totalExpenses - totalPayments

  const cardLookup = useMemo(() => {
    const map = new Map<string, { color: string; type: CardBrand }>()
    for (const card of cards) map.set(card.name, { color: card.color, type: card.type })
    return map
  }, [cards])

  const handleDeleteTransaction = (id: string, title: string, isInstallment: boolean) => {
    alert.confirmDelete(
      isInstallment
        ? `Excluir "${title}"? Todas as parcelas desta compra serão removidas.`
        : `Excluir "${title}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await transactionsApi.remove(id)
          await refresh({ silent: true })
        } catch (caught) {
          alert.show({
            variant: "error",
            message: caught instanceof ApiError ? caught.message : "Não foi possível excluir",
          })
        }
      },
    )
  }

  const handleDeleteEntry = (id: string, title: string) => {
    alert.confirmDelete(`Excluir o pagamento "${title}"? Esta ação não pode ser desfeita.`, async () => {
      try {
        await entriesApi.remove(id)
        await refresh({ silent: true })
      } catch (caught) {
        alert.show({
          variant: "error",
          message: caught instanceof ApiError ? caught.message : "Não foi possível excluir",
        })
      }
    })
  }

  if (isLoading) {
    return <Loading label="Carregando suas movimentações..." />
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 160 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={() => refresh()}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
            progressViewOffset={insets.top + spacing.lg}
          />
        }
      >
        <PageHeader
          title={`Olá, ${user?.name?.split(" ")[0] ?? "você"}`}
          subtitle={period.shortDisplay}
          userName={user?.name}
          onSync={() => refresh()}
          isSyncing={isSyncing}
        />

        {activeCards.length === 0 ? (
          <Banner
            tone="warning"
            icon="card-outline"
            message="Nenhum cartão ativo cadastrado. Fale com o administrador para começar a lançar despesas."
          />
        ) : null}

        <PeriodNavigator
          selected={period.selected}
          periods={period.periods}
          display={period.display}
          onSelect={period.setSelected}
          onOlder={period.goToOlder}
          onNewer={period.goToNewer}
          hasOlder={period.hasOlder}
          hasNewer={period.hasNewer}
        />

        <View style={styles.statsRow}>
          <StatCard
            label="Meus gastos"
            value={totalExpenses}
            icon="trending-down"
            tone="negative"
            caption={`${periodTransactions.length} despesa${periodTransactions.length === 1 ? "" : "s"}`}
            style={styles.statCard}
          />
          <StatCard
            label="Meus pagamentos"
            value={totalPayments}
            icon="trending-up"
            tone="positive"
            sign="+"
            caption={`${periodEntries.length} pagamento${periodEntries.length === 1 ? "" : "s"}`}
            style={styles.statCard}
          />
        </View>

        <StatCard
          label={balance > 0 ? "Ainda a pagar" : "Saldo do período"}
          value={Math.abs(balance)}
          icon={balance > 0 ? "alert-circle-outline" : "checkmark-circle-outline"}
          tone={balance > 0 ? "negative" : "positive"}
          caption={
            balance > 0
              ? `Gastos menos pagamentos em ${period.shortDisplay}`
              : "Seus pagamentos cobrem os gastos do período"
          }
        />

        <View style={styles.section}>
          <Text variant="heading">Minhas movimentações</Text>

          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "expenses", label: "Despesas", count: periodTransactions.length },
              { value: "payments", label: "Pagamentos", count: periodEntries.length },
            ]}
          />

          {tab === "expenses" ? (
            periodTransactions.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Nenhuma despesa no período"
                description={`Nada lançado em ${period.shortDisplay}. Use o botão + para registrar a primeira.`}
              />
            ) : (
              <View style={styles.list}>
                {periodTransactions.map((transaction) => {
                  const card = cardLookup.get(transaction.cardName)
                  return (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      cardColor={card?.color ?? theme.accent.primary}
                      cardBrand={card?.type ?? "visa"}
                      onDelete={() =>
                        handleDeleteTransaction(transaction.id, transaction.title, Boolean(transaction.isInstallment))
                      }
                    />
                  )
                })}
              </View>
            )
          ) : periodEntries.length === 0 ? (
            <EmptyState
              icon="wallet-outline"
              title="Nenhum pagamento no período"
              description={`Registre um pagamento para abater o saldo de ${period.shortDisplay}.`}
            />
          ) : (
            <View style={styles.list}>
              {periodEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={() => handleDeleteEntry(entry.id, entry.title)} />
              ))}
            </View>
          )}
        </View>

        {periodTransactions.length > 0 ? (
          <Text variant="micro" tone="muted" style={styles.footnote}>
            Total exibido: {formatCurrency(totalExpenses)} em despesas · {formatCurrency(totalPayments)} em pagamentos
          </Text>
        ) : null}
      </ScrollView>

      <ActionFab
        actions={[
          {
            label: "Despesa",
            icon: "receipt-outline",
            onPress: () => setExpenseOpen(true),
            disabled: activeCards.length === 0,
          },
          { label: "Pagamento", icon: "wallet-outline", onPress: () => setEntryOpen(true) },
        ]}
      />

      <ExpenseSheet
        visible={isExpenseOpen}
        onClose={() => setExpenseOpen(false)}
        onCreated={() => refresh({ silent: true })}
      />
      <EntrySheet
        visible={isEntryOpen}
        onClose={() => setEntryOpen(false)}
        onCreated={() => refresh({ silent: true })}
      />
    </>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  footnote: {
    textAlign: "center",
    marginTop: spacing.sm,
  },
})
