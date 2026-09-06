"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Plus,
  Receipt,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react"
import { AddExpenseModal } from "@/components/add-expense-modal"
import { AddEntryModal } from "@/components/add-entry-modal"
import { EditExpenseModal } from "@/components/edit-expense-modal"
import { TransactionHistory } from "@/components/transaction-history"
import { EntryHistory } from "@/components/entry-history"
import { PeriodBar } from "@/components/period-bar"
import { StatCard } from "@/components/stat-card"
import { getTransactionsAction, deleteTransactionAction } from "@/app/actions/transactions"
import { getEntriesAction, deleteEntryAction } from "@/app/actions/entries"
import { getCardsAction } from "@/app/actions/cards"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useAlertModal } from "@/hooks/use-alert-modal"
import { useSyncContext } from "@/contexts/sync-context"
import {
  collectPeriods,
  formatCurrency,
  getCurrentPeriod,
  getPeriodDisplay,
  groupSharedTransactions,
  isInPeriod,
  sumAmount,
  totalsByCard,
} from "@toliso/core"
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

interface DashboardProps {
  onLogout: () => void
  currentPage?: string
  userRole: "admin" | "user"
}

/**
 * Painel do administrador: todos os usuários, com filtros por pessoa e cartão.
 *
 * O agrupamento de despesas compartilhadas e o cálculo de período vêm de
 * `@toliso/core`, compartilhados com o servidor e o aplicativo.
 */
export function Dashboard({ onLogout, currentPage = "dashboard", userRole }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [cards, setCards] = useState<CardData[]>([])
  const [selectedCard, setSelectedCard] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentPeriod())
  const [isCardsExpanded, setIsCardsExpanded] = useState(true)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const alertModal = useAlertModal()
  const { registerSyncCallback, unregisterSyncCallback } = useSyncContext()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [transactionsResult, entriesResult, cardsResult] = await Promise.all([
        getTransactionsAction(),
        getEntriesAction(),
        getCardsAction(),
      ])

      const loadedTransactions: Transaction[] =
        transactionsResult.success && transactionsResult.transactions
          ? transactionsResult.transactions.map((item: any) => ({ ...item, amount: Number(item.amount) }))
          : []
      const loadedEntries: Entry[] =
        entriesResult.success && entriesResult.entries ? (entriesResult.entries as Entry[]) : []

      setTransactions(loadedTransactions)
      setEntries(loadedEntries)

      if (userRole === "admin") {
        // A lista de filtros vem dos lançamentos existentes: mostrar alguém sem
        // movimentação só criaria um filtro que devolve tela vazia.
        const byEmail = new Map<string, { id: string; name: string; email: string }>()
        for (const item of [...loadedTransactions, ...loadedEntries]) {
          if (item.userEmail && !byEmail.has(item.userEmail)) {
            byEmail.set(item.userEmail, { id: item.userId, name: item.userName, email: item.userEmail })
          }
        }
        setUsers(Array.from(byEmail.values()).sort((a, b) => a.name.localeCompare(b.name)))
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
  }, [userRole])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    registerSyncCallback("dashboard", loadData)
    return () => unregisterSyncCallback("dashboard")
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

  const filteredTransactions = useMemo(() => {
    let result = periodTransactions
    if (selectedUser !== "all") result = result.filter((item) => item.userEmail === selectedUser)
    if (selectedCard !== "all") result = result.filter((item) => item.cardName === selectedCard)
    return groupSharedTransactions(result as any) as Transaction[]
  }, [periodTransactions, selectedUser, selectedCard])

  const filteredEntries = useMemo(
    () => (selectedUser === "all" ? periodEntries : periodEntries.filter((item) => item.userEmail === selectedUser)),
    [periodEntries, selectedUser],
  )

  const cardTotals = useMemo(
    () => totalsByCard(periodTransactions as any, cards).filter((item) => item.total > 0),
    [periodTransactions, cards],
  )

  const totalExpenses = sumAmount(periodTransactions)
  const totalPayments = sumAmount(periodEntries)
  const activeFilterCount = (selectedUser !== "all" ? 1 : 0) + (selectedCard !== "all" ? 1 : 0)

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

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsEditExpenseModalOpen(true)
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
  const cardNames = cards.map((card) => card.name)
  const selectedUserName = users.find((user) => user.email === selectedUser)?.name

  return (
    <div className="space-y-4 sm:space-y-6">
      {hasNoCards ? (
        <Alert className="glass glass-soft glass-flat border-0">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm text-muted-foreground">
            Nenhum cartão ativo cadastrado. Vá em Cartões para adicionar antes de criar despesas.
          </AlertDescription>
        </Alert>
      ) : null}

      <PeriodBar periods={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <StatCard
          label="Gastos totais"
          value={totalExpenses}
          tone="negative"
          icon={TrendingDown}
          caption={`Todos os usuários · ${getPeriodDisplay(selectedPeriod, { includeRange: false })}`}
        />
        <StatCard
          label="Pagamentos totais"
          value={totalPayments}
          tone="positive"
          sign="+"
          icon={TrendingUp}
          caption={`Todos os usuários · ${getPeriodDisplay(selectedPeriod, { includeRange: false })}`}
        />
      </div>

      {cardTotals.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Gastos por cartão</CardTitle>
              <CardDescription>{getPeriodDisplay(selectedPeriod)}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCardsExpanded(!isCardsExpanded)}
              aria-expanded={isCardsExpanded}
            >
              {isCardsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="hidden sm:inline">{isCardsExpanded ? "Minimizar" : "Expandir"}</span>
            </Button>
          </CardHeader>

          {isCardsExpanded ? (
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cardTotals.map((item) => (
                  <div
                    key={item.cardName}
                    className="glass glass-soft glass-flat relative overflow-hidden rounded-md p-4"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[3px]"
                      style={{ backgroundColor: item.cardColor }}
                    />
                    <div className="mb-1.5 flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" style={{ color: item.cardColor }} />
                      <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.cardName}
                      </span>
                    </div>
                    <p className="tabular truncate text-xl font-bold text-destructive">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 ? (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Refine o que aparece na lista de movimentações.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {users.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="filter-user" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Usuário
                  </Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="filter-user">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.email} value={user.email}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {cards.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="filter-card" className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    Cartão
                  </Label>
                  <Select value={selectedCard} onValueChange={setSelectedCard}>
                    <SelectTrigger id="filter-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os cartões</SelectItem>
                      {cardNames.map((card) => (
                        <SelectItem key={card} value={card}>
                          {card}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser("all")
                    setSelectedCard("all")
                  }}
                >
                  Limpar
                </Button>
                <Button onClick={() => setIsFiltersOpen(false)}>Aplicar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {selectedUser !== "all" ? (
          <Badge variant="outline" className="h-9 gap-1.5 px-3">
            <Users className="h-3 w-3" />
            {selectedUserName ?? selectedUser}
            <button type="button" onClick={() => setSelectedUser("all")} aria-label="Remover filtro de usuário">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null}

        {selectedCard !== "all" ? (
          <Badge variant="outline" className="h-9 gap-1.5 px-3">
            <CreditCard className="h-3 w-3" />
            {selectedCard}
            <button type="button" onClick={() => setSelectedCard("all")} aria-label="Remover filtro de cartão">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : null}

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
          <CardDescription>
            {selectedUser === "all" ? "Todos os usuários" : `Movimentações de ${selectedUserName}`}
            {selectedCard !== "all" ? ` · cartão ${selectedCard}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Despesas ({filteredTransactions.length})</TabsTrigger>
              <TabsTrigger value="entries">Pagamentos ({filteredEntries.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <TransactionHistory
                transactions={filteredTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={handleEditTransaction}
                showUserInfo
                cards={cards}
                isAdmin
              />
            </TabsContent>

            <TabsContent value="entries" className="mt-4">
              <EntryHistory entries={filteredEntries} onDeleteEntry={handleDeleteEntry} showUserInfo />
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
          cards={cardNames}
        />
      ) : null}

      {!hasNoCards ? (
        <EditExpenseModal
          isOpen={isEditExpenseModalOpen}
          onClose={() => {
            setIsEditExpenseModalOpen(false)
            setSelectedTransaction(null)
          }}
          onEditExpense={loadData}
          transaction={selectedTransaction}
          cards={cardNames}
        />
      ) : null}
    </div>
  )
}
