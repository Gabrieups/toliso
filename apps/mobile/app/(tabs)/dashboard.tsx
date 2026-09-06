import { Ionicons } from "@expo/vector-icons"
import { Redirect } from "expo-router"
import React, { useMemo, useState } from "react"
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "@/api/client"
import { entriesApi, transactionsApi } from "@/api/endpoints"
import { ActionFab } from "@/components/ActionFab"
import { useAlert } from "@/components/AlertProvider"
import { Chip } from "@/components/Chip"
import { EmptyState, Loading } from "@/components/Feedback"
import { EditExpenseSheet } from "@/components/forms/EditExpenseSheet"
import { EntrySheet } from "@/components/forms/EntrySheet"
import { ExpenseSheet } from "@/components/forms/ExpenseSheet"
import { Glass } from "@/components/Glass"
import { EntryRow, TransactionRow } from "@/components/MovementRow"
import { PageHeader } from "@/components/PageHeader"
import { PeriodNavigator } from "@/components/PeriodNavigator"
import { Segmented } from "@/components/Segmented"
import { Select } from "@/components/Select"
import { Sheet } from "@/components/Sheet"
import { StatCard } from "@/components/StatCard"
import { Text } from "@/components/Text"
import { usePeriodNavigation } from "@/hooks/usePeriodNavigation"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"
import {
  formatCurrency,
  groupSharedTransactions,
  isInPeriod,
  sumAmount,
  totalsByCard,
  type CardBrand,
  type Transaction,
} from "@toliso/core"

type Tab = "expenses" | "payments"

/**
 * Painel do administrador: visão de todos os usuários, com filtros por pessoa e
 * cartão, gastos por cartão e edição de lançamentos.
 */
export default function DashboardScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const alert = useAlert()
  const { isAdmin } = useAuth()
  const { transactions, entries, cards, activeCards, isLoading, isSyncing, refresh } = useData()

  const [tab, setTab] = useState<Tab>("expenses")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<string>("all")
  const [isFiltersOpen, setFiltersOpen] = useState(false)
  const [isExpenseOpen, setExpenseOpen] = useState(false)
  const [isEntryOpen, setEntryOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const period = usePeriodNavigation([...transactions, ...entries])

  // Pessoas que aparecem nos lançamentos — a lista real, não a de cadastro.
  const people = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of [...transactions, ...entries]) {
      if (item.userEmail) map.set(item.userEmail, item.userName)
    }
    return Array.from(map, ([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions, entries])

  const periodTransactions = useMemo(
    () => transactions.filter((transaction) => isInPeriod(transaction.date, period.selected)),
    [transactions, period.selected],
  )
  const periodEntries = useMemo(
    () => entries.filter((entry) => isInPeriod(entry.date, period.selected)),
    [entries, period.selected],
  )

  const filteredTransactions = useMemo(() => {
    let result = periodTransactions
    if (userFilter !== "all") result = result.filter((item) => item.userEmail === userFilter)
    if (cardFilter !== "all") result = result.filter((item) => item.cardName === cardFilter)
    return groupSharedTransactions(result)
  }, [periodTransactions, userFilter, cardFilter])

  const filteredEntries = useMemo(
    () => (userFilter === "all" ? periodEntries : periodEntries.filter((item) => item.userEmail === userFilter)),
    [periodEntries, userFilter],
  )

  const cardTotals = useMemo(
    () => totalsByCard(periodTransactions, activeCards).filter((item) => item.total > 0),
    [periodTransactions, activeCards],
  )

  const cardLookup = useMemo(() => {
    const map = new Map<string, { color: string; type: CardBrand }>()
    for (const card of cards) map.set(card.name, { color: card.color, type: card.type })
    return map
  }, [cards])

  const totalExpenses = sumAmount(periodTransactions)
  const totalPayments = sumAmount(periodEntries)
  const activeFilters = (userFilter !== "all" ? 1 : 0) + (cardFilter !== "all" ? 1 : 0)

  const handleDeleteTransaction = (transaction: Transaction) => {
    alert.confirmDelete(
      transaction.isInstallment
        ? `Excluir "${transaction.title}"? Todas as parcelas serão removidas.`
        : transaction.isShared
          ? `Excluir "${transaction.title}"? Ela está dividida com outras pessoas.`
          : `Excluir "${transaction.title}"? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await transactionsApi.remove(transaction.id)
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
    alert.confirmDelete(`Excluir o pagamento "${title}"?`, async () => {
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

  // A verificação vem depois dos hooks para não quebrar a ordem entre renders.
  if (!isAdmin) {
    return <Redirect href="/(tabs)/home" />
  }

  if (isLoading) {
    return <Loading label="Carregando o painel..." />
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
          title="Painel"
          subtitle="Todos os usuários"
          onSync={() => refresh()}
          isSyncing={isSyncing}
        />

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
            label="Gastos totais"
            value={totalExpenses}
            icon="trending-down"
            tone="negative"
            caption="Todos os usuários"
            style={styles.statCard}
          />
          <StatCard
            label="Pagamentos"
            value={totalPayments}
            icon="trending-up"
            tone="positive"
            sign="+"
            caption="Todos os usuários"
            style={styles.statCard}
          />
        </View>

        {cardTotals.length > 0 ? (
          <View style={styles.section}>
            <Text variant="heading">Gastos por cartão</Text>
            <View style={styles.cardGrid}>
              {cardTotals.map((item) => (
                <Glass
                  key={item.cardName}
                  variant="soft"
                  corner="md"
                  elevation="flat"
                  accentColor={item.cardColor}
                  style={styles.cardTile}
                  contentStyle={styles.cardTileContent}
                >
                  <Text variant="micro" tone="secondary" numberOfLines={1}>
                    {item.cardName.toUpperCase()}
                  </Text>
                  <Text variant="amountSmall" tone="negative" tabular numberOfLines={1}>
                    {formatCurrency(item.total)}
                  </Text>
                </Glass>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros"
            style={[styles.filterButton, { backgroundColor: theme.glass.fill, borderColor: theme.glass.border }]}
          >
            <Ionicons name="options-outline" size={16} color={theme.text.primary} />
            <Text variant="caption">Filtros</Text>
            {activeFilters > 0 ? (
              <View style={[styles.filterBadge, { backgroundColor: theme.accent.primary }]}>
                <Text variant="micro" tone="inverse">
                  {activeFilters}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {userFilter !== "all" ? (
            <Chip
              label={people.find((person) => person.email === userFilter)?.name ?? userFilter}
              tone="info"
              icon="person-outline"
              onRemove={() => setUserFilter("all")}
            />
          ) : null}

          {cardFilter !== "all" ? (
            <Chip label={cardFilter} tone="info" icon="card-outline" onRemove={() => setCardFilter("all")} />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text variant="heading">Movimentações</Text>

          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "expenses", label: "Despesas", count: filteredTransactions.length },
              { value: "payments", label: "Pagamentos", count: filteredEntries.length },
            ]}
          />

          {tab === "expenses" ? (
            filteredTransactions.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Nenhuma despesa encontrada"
                description="Ajuste os filtros ou escolha outro período."
              />
            ) : (
              <View style={styles.list}>
                {filteredTransactions.map((transaction) => {
                  const card = cardLookup.get(transaction.cardName)
                  return (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      cardColor={card?.color ?? theme.accent.primary}
                      cardBrand={card?.type ?? "visa"}
                      showOwner
                      onEdit={() => setEditing(transaction)}
                      onDelete={() => handleDeleteTransaction(transaction)}
                    />
                  )
                })}
              </View>
            )
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              icon="wallet-outline"
              title="Nenhum pagamento encontrado"
              description="Ajuste os filtros ou escolha outro período."
            />
          ) : (
            <View style={styles.list}>
              {filteredEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  showOwner
                  onDelete={() => handleDeleteEntry(entry.id, entry.title)}
                />
              ))}
            </View>
          )}
        </View>
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

      <Sheet
        visible={isFiltersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        subtitle="Refine o que aparece na lista"
        scrollable={false}
        footer={
          <>
            <Pressable
              onPress={() => {
                setUserFilter("all")
                setCardFilter("all")
              }}
              accessibilityRole="button"
              style={[styles.clearButton, { borderColor: theme.glass.border }]}
            >
              <Text variant="caption" tone="secondary">
                Limpar
              </Text>
            </Pressable>
          </>
        }
      >
        <Select
          label="Usuário"
          icon="person-outline"
          value={userFilter}
          onChange={setUserFilter}
          options={[
            { value: "all", label: "Todos os usuários" },
            ...people.map((person) => ({ value: person.email, label: person.name, description: person.email })),
          ]}
        />

        <Select
          label="Cartão"
          icon="card-outline"
          value={cardFilter}
          onChange={setCardFilter}
          options={[
            { value: "all", label: "Todos os cartões" },
            ...activeCards.map((card) => ({ value: card.name, label: card.name, color: card.color })),
          ]}
        />
      </Sheet>

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
      <EditExpenseSheet
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={() => refresh({ silent: true })}
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
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  cardTile: {
    flexGrow: 1,
    flexBasis: "46%",
  },
  cardTileContent: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  list: {
    gap: spacing.md,
  },
  clearButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
})
