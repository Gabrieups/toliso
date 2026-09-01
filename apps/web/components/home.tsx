"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Plus, Receipt, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { AddExpenseModal } from "@/components/add-expense-modal"
import { AddEntryModal } from "@/components/add-entry-modal"
import { TransactionHistory } from "@/components/transaction-history"
import { EntryHistory } from "@/components/entry-history"
import { PeriodBar } from "@/components/period-bar"
import { StatCard } from "@/components/stat-card"
import { getTransactionsAction, deleteTransactionAction } from "@/app/actions/transactions"
import { getEntriesAction, deleteEntryAction } from "@/app/actions/entries"
import { getCardsAction } from "@/app/actions/cards"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSyncContext } from "@/contexts/sync-context"
import { useAlertModal } from "@/hooks/use-alert-modal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { collectPeriods, getCurrentPeriod, getPeriodDisplay, isInPeriod, sumAmount } from "@toliso/core"
import type { Transaction } from "@/types/transaction"

interface Entry {
  id: string
  title: string
  description: string
  amount: number
  date: string
  userId: string
  userName: string
  userEmail: string
}

interface CardData {
  id: string
  name: string
  color: string
  type: "visa" | "mastercard" | "elo" | "american-express"
}

interface HomeProps {
  onLogout: () => void
  userRole: "admin" | "user"
}

/**
 * Tela inicial: o resumo pessoal do período.
 *
 * O cálculo de período vem de `@toliso/core`, a mesma função usada pelo
 * servidor e pelo aplicativo — antes cada tela tinha a sua cópia.
 */
export function Home({ onLogout, userRole }: HomeProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [cards, setCards] = useState<CardData[]>([])
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentPeriod())
  const alertModal = useAlertModal()
  const { registerSyncCallback, unregisterSyncCallback } = useSyncContext()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const currentUserEmail = localStorage.getItem("userEmail")

      const [transactionsResult, entriesResult, cardsResult] = await Promise.all([
        getTransactionsAction(),
        getEntriesAction(),
        getCardsAction(),
      ])

      if (transactionsResult.success && transactionsResult.transactions) {
        setTransactions(
          transactionsResult.transactions.filter((item: any) => item.userEmail === currentUserEmail) as Transaction[],
        )
      }

      if (entriesResult.success && entriesResult.entries) {
        setEntries(entriesResult.entries.filter((item: any) => item.userEmail === currentUserEmail) as Entry[])
      }

      if (cardsResult.success && cardsResult.cards) {
        setCards(
          cardsResult.cards
            .filter((card: any) => card.status === "active")
            .map((card: any) => ({ id: card.id, name: card.name, color: card.color, type: card.type })),
        )
      } else {
        setCards([])
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      setCards([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, userRole])

  useEffect(() => {
    registerSyncCallback("home", loadData)
    return () => unregisterSyncCallback("home")
  }, [registerSyncCallback, unregisterSyncCallback, loadData])

  const periods = useMemo(() => collectPeriods([...transactions, ...entries]), [transactions, entries])

  const periodTransactions = useMemo(
    () => transactions.filter((item) => isInPeriod(item.date, selectedPeriod)),
    [transactions, selectedPeriod],
  )
  const periodEntries = useMemo(
    () => entries.filter((item) => isInPeriod(item.date, selectedPeriod)),
    [entries, selectedPeriod],
  )

  const totalExpenses = sumAmount(periodTransactions)
  const totalPayments = sumAmount(periodEntries)
  const balance = totalExpenses - totalPayments

  const handleDeleteTransaction = async (id: string) => {
    try {
      const result = await deleteTransactionAction(id)
      if (result.success) {
        await loadData()
      } else {
        alertModal.open({ variant: "error", message: result.error || "Erro ao excluir despesa" })
      }
    } catch (error) {
      console.error("Erro ao excluir transação:", error)
      alertModal.open({ variant: "error", message: "Erro ao excluir despesa" })
    }
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      const result = await deleteEntryAction(id)
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

  const hasNoCards = cards.length === 0
  const periodLabel = getPeriodDisplay(selectedPeriod, { includeRange: false })

  return (
    <div className="space-y-4 sm:space-y-6">
      {hasNoCards ? (
        <Alert className="glass glass-soft glass-flat border-0">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm text-muted-foreground">
            Nenhum cartão ativo cadastrado. Fale com o administrador para começar a lançar despesas.
          </AlertDescription>
        </Alert>
      ) : null}

      <PeriodBar periods={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Meus gastos"
          value={totalExpenses}
          tone="negative"
          icon={TrendingDown}
          caption={`${periodTransactions.length} despesa${periodTransactions.length === 1 ? "" : "s"} · ${periodLabel}`}
        />
        <StatCard
          label="Meus pagamentos"
          value={totalPayments}
          tone="positive"
          sign="+"
          icon={TrendingUp}
          caption={`${periodEntries.length} pagamento${periodEntries.length === 1 ? "" : "s"} · ${periodLabel}`}
        />
        <StatCard
          label={balance > 0 ? "Ainda a pagar" : "Saldo do período"}
          value={Math.abs(balance)}
          tone={balance > 0 ? "negative" : "positive"}
          icon={Scale}
          caption={balance > 0 ? "Gastos menos pagamentos" : "Seus pagamentos cobrem o período"}
        />
      </div>

      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setIsAddExpenseModalOpen(true)} disabled={hasNoCards}>
              <Receipt className="mr-2 h-4 w-4" />
              Despesa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAddEntryModalOpen(true)}>
              <Wallet className="mr-2 h-4 w-4" />
              Pagamento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Minhas movimentações</CardTitle>
          <CardDescription>{getPeriodDisplay(selectedPeriod)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Despesas ({periodTransactions.length})</TabsTrigger>
              <TabsTrigger value="entries">Pagamentos ({periodEntries.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <TransactionHistory
                transactions={periodTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                showUserInfo={false}
                cards={cards}
              />
            </TabsContent>

            <TabsContent value="entries" className="mt-4">
              <EntryHistory entries={periodEntries} onDeleteEntry={handleDeleteEntry} showUserInfo={false} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onAddEntry={loadData} />

      {!hasNoCards ? (
        <AddExpenseModal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setIsAddExpenseModalOpen(false)}
          onAddExpense={loadData}
          cards={cards.map((card) => card.name)}
        />
      ) : null}
    </div>
  )
}
