"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Filter, Plus, Receipt, Trash2, Wallet } from "lucide-react"
import { getInvoicesAction } from "@/app/actions/invoices"
import { getCardsAction } from "@/app/actions/cards"
import { deleteEntryAction } from "@/app/actions/entries"
import { AddEntryModal } from "@/components/add-entry-modal"
import { PeriodBar } from "@/components/period-bar"
import { CardBrandIcon } from "@/components/card-brand-icon"
import { useAlertModal } from "@/hooks/use-alert-modal"
import { useSyncContext } from "@/contexts/sync-context"
import { formatCurrency, formatDate, getCurrentPeriod, getPeriodDisplay } from "@toliso/core"
import type { Invoice, PaymentBlock } from "@toliso/core"

/**
 * Faturas por cartão e período, com o bloco de pagamentos aplicados.
 *
 * Cada fatura abre e fecha individualmente — a lista de transações costuma ser
 * longa e ninguém quer rolar tudo para comparar dois cartões.
 */
export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentBlocks, setPaymentBlocks] = useState<PaymentBlock[]>([])
  const [cards, setCards] = useState<string[]>([])
  const [selectedCard, setSelectedCard] = useState<string>("all")
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentPeriod())
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const alertModal = useAlertModal()
  const { registerSyncCallback, unregisterSyncCallback } = useSyncContext()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [invoicesResult, cardsResult] = await Promise.all([getInvoicesAction(), getCardsAction()])

      if (invoicesResult.success && invoicesResult.invoices && invoicesResult.paymentBlocks) {
        setInvoices(invoicesResult.invoices)
        setPaymentBlocks(invoicesResult.paymentBlocks)
      }

      if (cardsResult.success && cardsResult.cards) {
        setCards(cardsResult.cards.filter((card: any) => card.status === "active").map((card: any) => card.name))
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    registerSyncCallback("invoices", loadData)
    return () => unregisterSyncCallback("invoices")
  }, [registerSyncCallback, unregisterSyncCallback, loadData])

  const periods = useMemo(() => {
    const merged = new Set([
      ...invoices.map((invoice) => invoice.period),
      ...paymentBlocks.map((block) => block.period),
      getCurrentPeriod(),
    ])
    return Array.from(merged).sort().reverse()
  }, [invoices, paymentBlocks])

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) => invoice.period === selectedPeriod && (selectedCard === "all" || invoice.cardName === selectedCard),
      ),
    [invoices, selectedPeriod, selectedCard],
  )

  const filteredPaymentBlocks = useMemo(
    () => paymentBlocks.filter((block) => block.period === selectedPeriod),
    [paymentBlocks, selectedPeriod],
  )

  const totals = useMemo(() => {
    const expenses = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalExpenses, 0)
    const payments = filteredPaymentBlocks.reduce((sum, block) => sum + block.totalEntries, 0)
    return { expenses, payments, balance: expenses - payments }
  }, [filteredInvoices, filteredPaymentBlocks])

  const toggle = (key: string) => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const result = await deleteEntryAction(entryId)
      if (result.success) {
        await loadData()
      } else {
        alertModal.open({ variant: "error", message: result.error || "Erro ao excluir pagamento" })
      }
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error)
      alertModal.open({ variant: "error", message: "Erro ao excluir pagamento" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div
          role="status"
          aria-label="Carregando"
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
        />
      </div>
    )
  }

  const isEmpty = filteredInvoices.length === 0 && filteredPaymentBlocks.length === 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <PeriodBar periods={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} />

      {/* Resumo do período: as três leituras que importam, lado a lado. */}
      <div className="glass grid grid-cols-3 divide-x divide-border/50 rounded-lg p-4">
        <SummaryCell label="Gastos" value={totals.expenses} className="text-destructive" />
        <SummaryCell label="Pagos" value={totals.payments} className="text-primary" />
        <SummaryCell
          label="Saldo"
          value={Math.abs(totals.balance)}
          className={totals.balance > 0 ? "text-destructive" : "text-primary"}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {cards.length > 0 ? (
          <div className="flex flex-1 items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cartões</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card} value={card}>
                    {card}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button onClick={() => setIsAddEntryModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Adicionar pagamento
        </Button>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">Nada neste período</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {cards.length === 0
                ? "Cadastre cartões para que as faturas comecem a ser geradas."
                : `Nenhuma fatura ou pagamento em ${getPeriodDisplay(selectedPeriod, { includeRange: false })}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPaymentBlocks.map((block) => {
            const key = `payment-${block.period}`
            const isExpanded = expanded.has(key)

            return (
              <Card key={key} className="glass-accent overflow-hidden [--accent-color:hsl(var(--primary))]">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-foreground/[0.03]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12">
                    <Wallet className="h-4 w-4 text-primary" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Pagamentos</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {block.entries.length} lançamento{block.entries.length === 1 ? "" : "s"} · {block.periodDisplay}
                    </p>
                  </div>

                  <p className="tabular shrink-0 text-lg font-bold text-primary">
                    +{formatCurrency(block.totalEntries)}
                  </p>

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isExpanded ? (
                  <CardContent className="space-y-2 pt-0">
                    {block.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="glass glass-soft glass-flat flex items-center gap-3 rounded-md p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDate(entry.date)}
                            {entry.userName ? ` · ${entry.userName}` : ""}
                          </p>
                        </div>

                        <p className="tabular shrink-0 text-sm font-bold text-primary">
                          +{formatCurrency(entry.amount)}
                        </p>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${entry.title}`}
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            alertModal.open({
                              variant: "warning",
                              title: "Excluir pagamento",
                              message: `Tem certeza que deseja excluir "${entry.title}"${entry.userName ? ` de ${entry.userName}` : ""}? Esta ação não pode ser desfeita.`,
                              showCancel: true,
                              confirmText: "Excluir",
                              onConfirm: () => handleDeleteEntry(entry.id),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                ) : null}
              </Card>
            )
          })}

          {filteredInvoices.map((invoice) => {
            const key = `${invoice.cardId}-${invoice.period}`
            const isExpanded = expanded.has(key)

            return (
              <Card
                key={key}
                className="glass-accent overflow-hidden"
                style={{ ["--accent-color" as string]: invoice.cardColor }}
              >
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-foreground/[0.03]"
                >
                  <span
                    className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${invoice.cardColor}20` }}
                  >
                    <CardBrandIcon brand={invoice.cardType || "visa"} width={34} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{invoice.cardName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {invoice.periodDisplay} · vence dia {invoice.dueDate}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`tabular text-lg font-bold ${invoice.balance > 0 ? "text-destructive" : "text-primary"}`}
                    >
                      {formatCurrency(invoice.balance)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {invoice.balance > 0 ? "saldo devedor" : "quitada"}
                    </p>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isExpanded ? (
                  <CardContent className="pt-0">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-0 bg-destructive/12 text-destructive">
                        Gastos {formatCurrency(invoice.totalExpenses)}
                      </Badge>
                      {invoice.paymentsApplied > 0 ? (
                        <Badge variant="outline" className="border-0 bg-primary/12 text-primary">
                          Pagos {formatCurrency(invoice.paymentsApplied)}
                        </Badge>
                      ) : null}
                    </div>

                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Transações ({invoice.transactions.length})
                    </p>

                    <div className="space-y-2">
                      {invoice.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="glass glass-soft glass-flat flex items-start gap-3 rounded-md p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{transaction.title}</p>
                            {transaction.description ? (
                              <p className="truncate text-xs text-muted-foreground">{transaction.description}</p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground">{formatDate(transaction.date)}</span>
                              {transaction.isShared ? (
                                <Badge variant="outline" className="h-5">
                                  Dividida
                                </Badge>
                              ) : null}
                              {transaction.isInstallment && transaction.totalInstallments ? (
                                <Badge variant="outline" className="h-5">
                                  {transaction.currentInstallment}/{transaction.totalInstallments}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <p className="tabular shrink-0 text-sm font-bold text-destructive">
                            {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}

      <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onAddEntry={loadData} />
    </div>
  )
}

function SummaryCell({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="px-2 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`tabular mt-1 truncate text-base font-bold sm:text-lg ${className}`}>{formatCurrency(value)}</p>
    </div>
  )
}
