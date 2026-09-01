import { Ionicons } from "@expo/vector-icons"
import { Redirect } from "expo-router"
import React, { useMemo, useState } from "react"
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "@/api/client"
import { entriesApi } from "@/api/endpoints"
import { ActionFab } from "@/components/ActionFab"
import { useAlert } from "@/components/AlertProvider"
import { CardBrandMark } from "@/components/CardBrand"
import { Chip } from "@/components/Chip"
import { EmptyState, Loading } from "@/components/Feedback"
import { EntrySheet } from "@/components/forms/EntrySheet"
import { Glass } from "@/components/Glass"
import { PageHeader } from "@/components/PageHeader"
import { PeriodNavigator } from "@/components/PeriodNavigator"
import { Select } from "@/components/Select"
import { Text } from "@/components/Text"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"
import {
  formatCurrency,
  formatDate,
  getCurrentPeriod,
  getPeriodDisplay,
  type Invoice,
  type PaymentBlock,
} from "@toliso/core"

/**
 * Faturas por cartão e período, com o bloco de pagamentos aplicados.
 *
 * Cada fatura abre e fecha individualmente: a lista de transações costuma ser
 * longa e ninguém quer rolar tudo para comparar dois cartões.
 */
export default function InvoicesScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const alert = useAlert()
  const { isAdmin } = useAuth()
  const { invoices, paymentBlocks, activeCards, isLoading, isSyncing, refresh } = useData()

  const [selectedPeriod, setSelectedPeriod] = useState(() => getCurrentPeriod())
  const [cardFilter, setCardFilter] = useState("all")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isEntryOpen, setEntryOpen] = useState(false)

  const periods = useMemo(() => {
    const all = new Set<string>([
      ...invoices.map((invoice) => invoice.period),
      ...paymentBlocks.map((block) => block.period),
      getCurrentPeriod(),
      selectedPeriod,
    ])
    return Array.from(all).sort().reverse()
  }, [invoices, paymentBlocks, selectedPeriod])

  const index = periods.indexOf(selectedPeriod)

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.period === selectedPeriod && (cardFilter === "all" || invoice.cardName === cardFilter),
      ),
    [invoices, selectedPeriod, cardFilter],
  )

  const filteredPayments = useMemo(
    () => paymentBlocks.filter((block) => block.period === selectedPeriod),
    [paymentBlocks, selectedPeriod],
  )

  const totals = useMemo(() => {
    const expenses = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalExpenses, 0)
    const payments = filteredPayments.reduce((sum, block) => sum + block.totalEntries, 0)
    return { expenses, payments, balance: expenses - payments }
  }, [filteredInvoices, filteredPayments])

  const toggle = (key: string) => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
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

  if (!isAdmin) {
    return <Redirect href="/(tabs)/home" />
  }

  if (isLoading) {
    return <Loading label="Montando suas faturas..." />
  }

  const isEmpty = filteredInvoices.length === 0 && filteredPayments.length === 0

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
          title="Faturas"
          subtitle="Ciclo do dia 16 ao dia 15"
          onSync={() => refresh()}
          isSyncing={isSyncing}
        />

        <PeriodNavigator
          selected={selectedPeriod}
          periods={periods}
          display={getPeriodDisplay(selectedPeriod)}
          onSelect={setSelectedPeriod}
          onOlder={() => index < periods.length - 1 && setSelectedPeriod(periods[index + 1])}
          onNewer={() => index > 0 && setSelectedPeriod(periods[index - 1])}
          hasOlder={index < periods.length - 1}
          hasNewer={index > 0}
        />

        <Glass contentStyle={styles.summary}>
          <View style={styles.summaryRow}>
            <SummaryCell label="Gastos" value={totals.expenses} color={theme.accent.negative} />
            <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
            <SummaryCell label="Pagos" value={totals.payments} color={theme.accent.positive} />
            <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
            <SummaryCell
              label="Saldo"
              value={Math.abs(totals.balance)}
              color={totals.balance > 0 ? theme.accent.negative : theme.accent.positive}
            />
          </View>
        </Glass>

        {activeCards.length > 0 ? (
          <Select
            label="Filtrar por cartão"
            icon="card-outline"
            value={cardFilter}
            onChange={setCardFilter}
            options={[
              { value: "all", label: "Todos os cartões" },
              ...activeCards.map((card) => ({ value: card.name, label: card.name, color: card.color })),
            ]}
          />
        ) : null}

        {isEmpty ? (
          <EmptyState
            icon="receipt-outline"
            title="Nada neste período"
            description={
              activeCards.length === 0
                ? "Cadastre cartões para que as faturas comecem a ser geradas."
                : `Nenhuma fatura ou pagamento em ${getPeriodDisplay(selectedPeriod, { includeRange: false })}.`
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredPayments.map((block) => (
              <PaymentCard
                key={`payment-${block.period}`}
                block={block}
                isExpanded={expanded.has(`payment-${block.period}`)}
                onToggle={() => toggle(`payment-${block.period}`)}
                onDeleteEntry={handleDeleteEntry}
              />
            ))}

            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={`${invoice.cardId}-${invoice.period}`}
                invoice={invoice}
                isExpanded={expanded.has(`${invoice.cardId}-${invoice.period}`)}
                onToggle={() => toggle(`${invoice.cardId}-${invoice.period}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ActionFab actions={[{ label: "Pagamento", icon: "wallet-outline", onPress: () => setEntryOpen(true) }]} />

      <EntrySheet
        visible={isEntryOpen}
        onClose={() => setEntryOpen(false)}
        onCreated={() => refresh({ silent: true })}
      />
    </>
  )
}

function SummaryCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text variant="micro" tone="secondary">
        {label.toUpperCase()}
      </Text>
      <Text variant="amountSmall" tabular style={{ color }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {formatCurrency(value)}
      </Text>
    </View>
  )
}

function InvoiceCard({
  invoice,
  isExpanded,
  onToggle,
}: {
  invoice: Invoice
  isExpanded: boolean
  onToggle: () => void
}) {
  const theme = useTheme()

  return (
    <Glass accentColor={invoice.cardColor} contentStyle={styles.cardContent}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={styles.cardHeader}
      >
        <View style={styles.cardIdentity}>
          <View style={[styles.cardIcon, { backgroundColor: `${invoice.cardColor}22` }]}>
            <CardBrandMark brand={invoice.cardType} />
          </View>
          <View style={styles.cardTitles}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {invoice.cardName}
            </Text>
            <Text variant="micro" tone="muted" numberOfLines={1}>
              Vence dia {invoice.dueDate} · fecha dia {invoice.closingDate}
            </Text>
          </View>
        </View>

        <View style={styles.cardValue}>
          <Text variant="amountSmall" tone={invoice.balance > 0 ? "negative" : "positive"} tabular>
            {formatCurrency(invoice.balance)}
          </Text>
          <Text variant="micro" tone="muted">
            {invoice.balance > 0 ? "saldo devedor" : "quitada"}
          </Text>
        </View>

        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.text.muted} />
      </Pressable>

      {isExpanded ? (
        <View style={styles.cardBody}>
          <View style={styles.chipRow}>
            <Chip label={`Gastos ${formatCurrency(invoice.totalExpenses)}`} tone="negative" icon="trending-down" />
            {invoice.paymentsApplied > 0 ? (
              <Chip label={`Pagos ${formatCurrency(invoice.paymentsApplied)}`} tone="positive" icon="trending-up" />
            ) : null}
          </View>

          <Text variant="caption" tone="secondary">
            Transações ({invoice.transactions.length})
          </Text>

          <View style={styles.itemList}>
            {invoice.transactions.map((transaction) => (
              <View
                key={transaction.id}
                style={[styles.item, { backgroundColor: theme.glass.fillSoft, borderColor: theme.glass.border }]}
              >
                <View style={styles.itemText}>
                  <Text variant="caption" numberOfLines={2}>
                    {transaction.title}
                  </Text>
                  <Text variant="micro" tone="muted">
                    {formatDate(transaction.date)}
                  </Text>
                  <View style={styles.chipRow}>
                    {transaction.isShared ? <Chip label="Dividida" tone="warning" /> : null}
                    {transaction.isInstallment && transaction.totalInstallments ? (
                      <Chip
                        label={`${transaction.currentInstallment}/${transaction.totalInstallments}`}
                        tone="info"
                      />
                    ) : null}
                  </View>
                </View>
                <Text variant="bodyStrong" tone="negative" tabular>
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Glass>
  )
}

function PaymentCard({
  block,
  isExpanded,
  onToggle,
  onDeleteEntry,
}: {
  block: PaymentBlock
  isExpanded: boolean
  onToggle: () => void
  onDeleteEntry: (id: string, title: string) => void
}) {
  const theme = useTheme()

  return (
    <Glass accentColor={theme.accent.positive} contentStyle={styles.cardContent}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={styles.cardHeader}
      >
        <View style={styles.cardIdentity}>
          <View style={[styles.cardIcon, { backgroundColor: theme.tint.positive }]}>
            <Ionicons name="wallet-outline" size={18} color={theme.accent.positive} />
          </View>
          <View style={styles.cardTitles}>
            <Text variant="bodyStrong">Pagamentos</Text>
            <Text variant="micro" tone="muted">
              {block.entries.length} lançamento{block.entries.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        <Text variant="amountSmall" tone="positive" tabular>
          +{formatCurrency(block.totalEntries)}
        </Text>

        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.text.muted} />
      </Pressable>

      {isExpanded ? (
        <View style={styles.cardBody}>
          <View style={styles.itemList}>
            {block.entries.map((entry) => (
              <View
                key={entry.id}
                style={[styles.item, { backgroundColor: theme.tint.positive, borderColor: "transparent" }]}
              >
                <View style={styles.itemText}>
                  <Text variant="caption" numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text variant="micro" tone="muted">
                    {formatDate(entry.date)}
                    {entry.userName ? ` · ${entry.userName}` : ""}
                  </Text>
                </View>

                <Text variant="bodyStrong" tone="positive" tabular>
                  +{formatCurrency(entry.amount)}
                </Text>

                <Pressable
                  onPress={() => onDeleteEntry(entry.id, entry.title)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir pagamento ${entry.title}`}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.accent.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Glass>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  summary: {
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  divider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 32,
  },
  list: {
    gap: spacing.md,
  },
  cardContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitles: {
    flex: 1,
    gap: 2,
  },
  cardValue: {
    alignItems: "flex-end",
  },
  cardBody: {
    gap: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemList: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
})
