"use client"

import type React from "react"
import { useAlertModal } from "@/hooks/use-alert-modal"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, AlertCircle, Minus, Calendar, Wallet, Receipt, ChevronLeft, ChevronRight } from "lucide-react"
import { AddExpenseModal } from "@/components/add-expense-modal"
import { AddEntryModal } from "@/components/add-entry-modal"
import { TransactionHistory } from "@/components/transaction-history"
import { EntryHistory } from "@/components/entry-history"
import { getTransactionsAction, deleteTransactionAction } from "@/app/actions/transactions"
import { getEntriesAction, deleteEntryAction } from "@/app/actions/entries"
import { getCardsAction } from "@/app/actions/cards"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PeriodCalendar } from "@/components/period-calendar"

interface Transaction {
  id: string
  title: string
  description: string
  amount: number
  originalAmount?: number
  cardName: string
  date: string
  userId: string
  userName: string
  userEmail: string
  isInstallment?: boolean
  totalInstallments?: number
  currentInstallment?: number
  isShared?: boolean
  sharedWith?: string[]
  sharedUserNames?: string[]
}

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

interface HomeProps {
  onLogout: () => void
  userRole: "admin" | "user"
}

export function Home({ onLogout, userRole }: HomeProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [cards, setCards] = useState<
    { id: string; name: string; color: string; type: "visa" | "mastercard" | "elo" | "american-express" }[]
  >([])
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const alertModal = useAlertModal()

  useEffect(() => {
    loadData()
  }, [userRole])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const transactionsResult = await getTransactionsAction()
      if (transactionsResult.success && transactionsResult.transactions) {
        const currentUserEmail = localStorage.getItem("userEmail")
        const userTransactions = transactionsResult.transactions
          .filter((t: any) => t.userEmail === currentUserEmail)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            amount: t.amount,
            originalAmount: t.originalAmount,
            cardName: t.cardName,
            date: t.date,
            userId: t.userId,
            userName: t.userName,
            userEmail: t.userEmail,
            isInstallment: t.isInstallment,
            totalInstallments: t.totalInstallments,
            currentInstallment: t.currentInstallment,
            isShared: t.isShared,
            sharedWith: t.sharedWith,
            sharedUserNames: t.sharedUserNames,
          }))
        setTransactions(userTransactions)
      }

      const entriesResult = await getEntriesAction()
      if (entriesResult.success && entriesResult.entries) {
        const currentUserEmail = localStorage.getItem("userEmail")
        const userEntries = entriesResult.entries.filter((e: any) => e.userEmail === currentUserEmail)
        setEntries(userEntries)
      }

      const cardsResult = await getCardsAction()
      if (cardsResult.success && cardsResult.cards) {
        const activeCards = cardsResult.cards.filter((card: any) => card.status === "active")
        setCards(
          activeCards.map((card: any) => ({
            id: card.id,
            name: card.name,
            color: card.color,
            type: card.type,
          })),
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
  }

  const getInvoicePeriod = (date: Date): { period: string; periodDisplay: string } => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

    if (day >= 16) {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const period = `${nextYear}-${nextMonth.toString().padStart(2, "0")}`

      const startDay = `16/${month.toString().padStart(2, "0")}`
      const endDay = `15/${nextMonth.toString().padStart(2, "0")}`
      const periodDisplay = `${monthNames[nextMonth - 1]}/${nextYear} (${startDay} - ${endDay})`

      return { period, periodDisplay }
    } else {
      const period = `${year}-${month.toString().padStart(2, "0")}`

      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const startDay = `16/${prevMonth.toString().padStart(2, "0")}`
      const endDay = `15/${month.toString().padStart(2, "0")}`
      const periodDisplay = `${monthNames[month - 1]}/${year} (${startDay} - ${endDay})`

      return { period, periodDisplay }
    }
  }

  const getCurrentPeriod = () => {
    return getInvoicePeriod(new Date()).period
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      const result = await deleteTransactionAction(id)
      if (result.success) {
        await loadData()
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao excluir transação",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir transação:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao excluir transação",
      })
    }
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      const result = await deleteEntryAction(id)
      if (result.success) {
        await loadData()
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao excluir pagamento",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao excluir pagamento",
      })
    }
  }

  let periodFilteredTransactions = transactions
  let periodFilteredEntries = entries

  if (selectedPeriod === "current") {
    const currentPeriod = getCurrentPeriod()
    periodFilteredTransactions = transactions.filter((t) => {
      const { period } = getInvoicePeriod(new Date(t.date))
      return period === currentPeriod
    })

    periodFilteredEntries = entries.filter((e) => {
      const { period } = getInvoicePeriod(new Date(e.date))
      return period === currentPeriod
    })
  } else {
    periodFilteredTransactions = transactions.filter((t) => {
      const { period } = getInvoicePeriod(new Date(t.date))
      return period === selectedPeriod
    })

    periodFilteredEntries = entries.filter((e) => {
      const { period } = getInvoicePeriod(new Date(e.date))
      return period === selectedPeriod
    })
  }

  const userTotalExpenses = periodFilteredTransactions.reduce((sum, t) => sum + t.amount, 0)
  const userTotalPayments = periodFilteredEntries.reduce((sum, e) => sum + e.amount, 0)

  const uniquePeriods = [
    ...new Set([
      ...transactions.map((t) => getInvoicePeriod(new Date(t.date)).period),
      ...entries.map((e) => getInvoicePeriod(new Date(e.date)).period),
    ]),
  ]
    .sort()
    .reverse()

  const currentPeriodDisplay = getInvoicePeriod(new Date()).periodDisplay

  const getSelectedPeriodDisplay = () => {
    if (selectedPeriod === "current") {
      return currentPeriodDisplay
    } else {
      const { periodDisplay } = getInvoicePeriod(new Date(`${selectedPeriod}-01`))
      return periodDisplay
    }
  }

  const selectedPeriodDisplay = getSelectedPeriodDisplay()

  const navigateToPreviousPeriod = () => {
    const currentIndex = uniquePeriods.findIndex(
      (p) => p === (selectedPeriod === "current" ? getCurrentPeriod() : selectedPeriod),
    )
    if (currentIndex < uniquePeriods.length - 1) {
      setSelectedPeriod(uniquePeriods[currentIndex + 1])
    }
  }

  const navigateToNextPeriod = () => {
    const currentIndex = uniquePeriods.findIndex(
      (p) => p === (selectedPeriod === "current" ? getCurrentPeriod() : selectedPeriod),
    )
    if (currentIndex > 0) {
      setSelectedPeriod(uniquePeriods[currentIndex - 1])
    } else if (currentIndex === 0 && selectedPeriod !== "current") {
      setSelectedPeriod("current")
    }
  }

  const isFirstPeriod = () => {
    return (
      selectedPeriod === "current" || (selectedPeriod === uniquePeriods[0] && uniquePeriods[0] === getCurrentPeriod())
    )
  }

  const isLastPeriod = () => {
    return selectedPeriod === uniquePeriods[uniquePeriods.length - 1]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-custom-primary"></div>
      </div>
    )
  }

  const hasNoCards = cards.length === 0
  const cardNames = cards.map((c) => c.name)

  return (
    <div className="flex flex-col space-y-4 sm:space-y-6 p-2 sm:p-4 overflow-auto">
      {hasNoCards && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm">
            Nenhum cartão de crédito cadastrado. Entre em contato com o administrador para cadastrar cartões.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-center gap-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={navigateToPreviousPeriod}
          disabled={isLastPeriod()}
          className="h-10 w-10 p-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCalendarOpen(true)}
          className="flex items-center gap-2 min-w-[280px] justify-center px-4 py-2 h-10 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Calendar className="h-4 w-4 text-custom-primary" />
          <span className="font-medium text-sm text-custom-text-primary dark:text-custom-text-primary-dark">
            {selectedPeriodDisplay}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={navigateToNextPeriod}
          disabled={isFirstPeriod()}
          className="h-10 w-10 p-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <PeriodCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        periods={uniquePeriods}
        selectedPeriod={selectedPeriod}
        onPeriodSelect={setSelectedPeriod}
        getCurrentPeriod={getCurrentPeriod}
        getInvoicePeriod={getInvoicePeriod}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Gastos</CardTitle>
            <Minus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              R$ {userTotalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{selectedPeriodDisplay}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Pagamentos</CardTitle>
            <Plus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              R$ {userTotalPayments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">{selectedPeriodDisplay}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center justify-center gap-2 bg-custom-primary hover:bg-custom-primary-dark text-white w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setIsAddExpenseModalOpen(true)} disabled={hasNoCards}>
              <Receipt className="h-4 w-4 mr-2" />
              <span>Despesa</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAddEntryModalOpen(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              <span>Pagamento</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Minhas Movimentações</CardTitle>
          <CardDescription className="text-sm">Suas últimas despesas e pagamentos</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Despesas ({periodFilteredTransactions.length})</TabsTrigger>
              <TabsTrigger value="entries">Pagamentos ({periodFilteredEntries.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions" className="mt-4">
              <TransactionHistory
                transactions={periodFilteredTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                showUserInfo={false}
                cards={cards}
              />
            </TabsContent>
            <TabsContent value="entries" className="mt-4">
              <EntryHistory entries={periodFilteredEntries} onDeleteEntry={handleDeleteEntry} showUserInfo={false} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onAddEntry={loadData} />

      {!hasNoCards && (
        <AddExpenseModal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setIsAddExpenseModalOpen(false)}
          onAddExpense={loadData}
          cards={cardNames}
        />
      )}
    </div>
  )
}

function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
    >
      {children}
    </label>
  )
}
