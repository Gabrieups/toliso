"use client"
import { useAlertModal } from "@/hooks/use-alert-modal"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CreditCard,
  Plus,
  Filter,
  Users,
  AlertCircle,
  Minus,
  Calendar,
  Wallet,
  ChevronDown,
  ChevronUp,
  Settings,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { AddExpenseModal } from "@/components/add-expense-modal"
import { AddEntryModal } from "@/components/add-entry-modal"
import { EditExpenseModal } from "@/components/edit-expense-modal"
import { TransactionHistory } from "@/components/transaction-history"
import { EntryHistory } from "@/components/entry-history"
import { getTransactionsAction, deleteTransactionAction } from "@/app/actions/transactions"
import { getEntriesAction, deleteEntryAction } from "@/app/actions/entries"
import { getCardsAction } from "@/app/actions/cards"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { PeriodCalendar } from "@/components/period-calendar"
import { Transaction } from "@/types/transaction"

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

interface DashboardProps {
  onLogout: () => void
  currentPage?: string
  userRole: "admin" | "user"
}

interface CardExpense {
  cardName: string
  cardColor: string
  total: number
}

export function Dashboard({ onLogout, currentPage = "dashboard", userRole }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [cards, setCards] = useState<
    { id: string; name: string; color: string; type: "visa" | "mastercard" | "elo" | "american-express" }[]
  >([])
  const [selectedCard, setSelectedCard] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current")
  const [isCardsExpanded, setIsCardsExpanded] = useState(true)
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
        const formattedTransactions = transactionsResult.transactions.map((t: any) => ({
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
          installmentGroup: t.installmentGroup,
        }))
        setTransactions(formattedTransactions)

        if (userRole === "admin") {
          const uniqueUsers = formattedTransactions.reduce((acc: any[], transaction: any) => {
            const existingUser = acc.find((user) => user.email === transaction.userEmail)
            if (!existingUser && transaction.userEmail) {
              acc.push({
                id: transaction.userId,
                name: transaction.userName,
                email: transaction.userEmail,
              })
            }
            return acc
          }, [])
          setUsers(uniqueUsers)
        }
      }

      const entriesResult = await getEntriesAction()
      if (entriesResult.success && entriesResult.entries) {
        setEntries(entriesResult.entries)

        if (userRole === "admin") {
          const entryUsers = entriesResult.entries.reduce((acc: any[], entry: any) => {
            const existingUser = acc.find((user) => user.email === entry.userEmail)
            if (!existingUser && entry.userEmail) {
              acc.push({
                id: entry.userId,
                name: entry.userName,
                email: entry.userEmail,
              })
            }
            return acc
          }, [])

          setUsers((prevUsers) => {
            const allUsers = [...prevUsers, ...entryUsers]
            return allUsers.filter((user, index, self) => index === self.findIndex((u) => u.email === user.email))
          })
        }
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

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsEditExpenseModalOpen(true)
  }

  const currentUserEmail = localStorage.getItem("userEmail")

  let userFilteredTransactions = transactions
  let userFilteredEntries = entries

  if (selectedUser !== "all") {
    userFilteredTransactions = transactions.filter((t) => t.userEmail === selectedUser)
    userFilteredEntries = entries.filter((e) => e.userEmail === selectedUser)
  }

  // Period filtering
  let periodFilteredTransactions = userFilteredTransactions
  let periodFilteredEntries = userFilteredEntries

  if (selectedPeriod === "current") {
    const currentPeriod = getCurrentPeriod()
    periodFilteredTransactions = userFilteredTransactions.filter((t) => {
      const { period } = getInvoicePeriod(new Date(t.date))
      return period === currentPeriod
    })

    periodFilteredEntries = userFilteredEntries.filter((e) => {
      const { period } = getInvoicePeriod(new Date(e.date))
      return period === currentPeriod
    })
  } else {
    periodFilteredTransactions = userFilteredTransactions.filter((t) => {
      const { period } = getInvoicePeriod(new Date(t.date))
      return period === selectedPeriod
    })

    periodFilteredEntries = userFilteredEntries.filter((e) => {
      const { period } = getInvoicePeriod(new Date(e.date))
      return period === selectedPeriod
    })
  }

  // Admin can filter by card, users cannot
  const filteredTransactions =
    userRole === "admin" && selectedCard !== "all"
      ? periodFilteredTransactions.filter((t) => t.cardName === selectedCard)
      : periodFilteredTransactions

  // Calculate stats based on SELECTED PERIOD
  const mySelectedPeriodTransactions = transactions.filter((t) => {
    const { period } = getInvoicePeriod(new Date(t.date))
    const targetPeriod = selectedPeriod === "current" ? getCurrentPeriod() : selectedPeriod

    if (selectedPeriod === "all") {
      return t.userEmail === currentUserEmail
    }
    return period === targetPeriod && t.userEmail === currentUserEmail
  })

  const mySelectedPeriodEntries = entries.filter((e) => {
    const { period } = getInvoicePeriod(new Date(e.date))
    const targetPeriod = selectedPeriod === "current" ? getCurrentPeriod() : selectedPeriod

    if (selectedPeriod === "all") {
      return e.userEmail === currentUserEmail
    }
    return period === targetPeriod && e.userEmail === currentUserEmail
  })

  const allUsersSelectedPeriodTransactions = transactions.filter((t) => {
    const { period } = getInvoicePeriod(new Date(t.date))
    const targetPeriod = selectedPeriod === "current" ? getCurrentPeriod() : selectedPeriod

    if (selectedPeriod === "all") {
      return true
    }
    return period === targetPeriod
  })

  // Admin stats
  const adminCardExpenses: CardExpense[] = cards.map((card) => {
    const cardTransactions = allUsersSelectedPeriodTransactions.filter((t) => t.cardName === card.name)
    const total = cardTransactions.reduce((sum, t) => sum + t.amount, 0)
    return {
      cardName: card.name,
      cardColor: card.color,
      total,
    }
  })

  const adminMyExpenses = mySelectedPeriodTransactions.reduce((sum, t) => sum + t.amount, 0)
  const adminMyPayments = mySelectedPeriodEntries.reduce((sum, e) => sum + e.amount, 0)

  // User stats
  const userTotalExpenses = mySelectedPeriodTransactions.reduce((sum, t) => sum + t.amount, 0)
  const userTotalPayments = mySelectedPeriodEntries.reduce((sum, e) => sum + e.amount, 0)

  const uniquePeriods = [
    ...new Set([
      ...userFilteredTransactions.map((t) => getInvoicePeriod(new Date(t.date)).period),
      ...userFilteredEntries.map((e) => getInvoicePeriod(new Date(e.date)).period),
    ]),
  ]
    .sort()
    .reverse()

  const getSelectedUserName = () => {
    if (selectedUser === "all") return "Todos os usuários"
    const user = users.find((u) => u.email === selectedUser)
    return user ? user.name : "Usuário selecionado"
  }

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

  const groupSharedTransactions = (transactions: Transaction[]): Transaction[] => {
    const grouped: { [key: string]: Transaction } = {}
    const individual: Transaction[] = []

    transactions.forEach((transaction) => {
      if (transaction.isShared && transaction.installmentGroup) {
        const key = `${transaction.installmentGroup}-${transaction.currentInstallment || 1}`
        if (!grouped[key]) {
          grouped[key] = {
            ...transaction,
            title: transaction.title.replace(/ - Parte .*$/, "").replace(/ - Compartilhado$/, ""),
            amount: transaction.originalAmount || transaction.amount,
            description: `Despesa compartilhada entre ${transaction.sharedUserNames?.join(", ")}`,
          }
        }
      } else if (transaction.isShared) {
        const dateKey = new Date(transaction.date).toISOString().split("T")[0]
        const baseTitle = transaction.title.replace(/ - Parte .*$/, "").replace(/ - Compartilhado$/, "")
        const key = `${baseTitle}-${dateKey}`
        if (!grouped[key]) {
          grouped[key] = {
            ...transaction,
            title: baseTitle,
            amount: transaction.originalAmount || transaction.amount,
            description: `Despesa compartilhada entre ${transaction.sharedUserNames?.join(", ")}`,
          }
        }
      } else {
        individual.push(transaction)
      }
    })

    return [...Object.values(grouped), ...individual]
  }

  const groupedTransactions = groupSharedTransactions(filteredTransactions)

  // Period navigation functions
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
            Nenhum cartão de crédito cadastrado.
            <span className="font-semibold cursor-pointer hover:underline ml-1">Vá para Gerenciar Cartões</span> para
            adicionar cartões antes de criar transações.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-2 py-2 w-full max-w-full overflow-hidden px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={navigateToPreviousPeriod}
          disabled={isLastPeriod()}
          className="h-10 w-10 p-0 flex-shrink-0"
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
          className="h-10 w-10 p-0 flex items-center justify-center"
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

      {userRole === "admin" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Totais (Todos Usuários)</CardTitle>
                <Minus className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-red-600">
                  R${" "}
                  {allUsersSelectedPeriodTransactions
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">{selectedPeriodDisplay}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagamentos Totais (Todos Usuários)</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  R${" "}
                  {entries
                    .filter((e) => {
                      const { period } = getInvoicePeriod(new Date(e.date))
                      const targetPeriod = selectedPeriod === "current" ? getCurrentPeriod() : selectedPeriod
                      return period === targetPeriod
                    })
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">{selectedPeriodDisplay}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Gastos por Cartão - Todos os Usuários</CardTitle>
                  <CardDescription className="text-sm">{selectedPeriodDisplay}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCardsExpanded(!isCardsExpanded)}
                  className="flex items-center gap-2"
                >
                  {isCardsExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Minimizar</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <span className="hidden sm:inline">Expandir</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {isCardsExpanded && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {adminCardExpenses.map((cardExpense) => (
                    <div
                      key={cardExpense.cardName}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-800"
                      style={{ borderLeftWidth: "4px", borderLeftColor: cardExpense.cardColor }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <CreditCard className="h-4 w-4" style={{ color: cardExpense.cardColor }} />
                        <span className="font-medium text-sm">{cardExpense.cardName}</span>
                      </div>
                      <div className="text-xl font-bold text-red-600">
                        R$ {cardExpense.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {userRole === "user" && (
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
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 bg-transparent w-full sm:w-auto"
            >
              <Settings className="h-4 w-4" />
              Filtros
              {(selectedUser !== "all" || selectedCard !== "all" || selectedPeriod !== "current") && (
                <span className="ml-1 h-2 w-2 rounded-full bg-custom-primary" />
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Opções de Filtro
              </DialogTitle>
              <DialogDescription>Configure os filtros para visualizar as movimentações</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {userRole === "admin" && users.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="filter-user" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Usuário
                  </Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="filter-user">
                      <SelectValue placeholder="Filtrar por usuário" />
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
              )}

              {userRole === "admin" && cards.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="filter-card" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Cartão
                  </Label>
                  <Select value={selectedCard} onValueChange={setSelectedCard}>
                    <SelectTrigger id="filter-card">
                      <SelectValue placeholder="Filtrar por cartão" />
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
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser("all")
                    setSelectedCard("all")
                  }}
                >
                  Limpar Filtros
                </Button>
                <Button onClick={() => setIsFiltersOpen(false)}>Aplicar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
          <CardTitle className="text-lg sm:text-xl">Histórico de Movimentações</CardTitle>
          <CardDescription className="text-sm">
            {userRole === "admin" ? (
              <>
                {selectedUser === "all"
                  ? "Todas as movimentações do sistema"
                  : `Movimentações de ${getSelectedUserName()}`}
                {selectedCard !== "all" && ` - despesas no cartão ${selectedCard}`}
              </>
            ) : (
              <>Suas últimas movimentações</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Despesas ({groupedTransactions.length})</TabsTrigger>
              <TabsTrigger value="entries">Pagamentos ({periodFilteredEntries.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="transactions" className="mt-4">
              <TransactionHistory
                transactions={groupedTransactions}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={userRole === "admin" ? handleEditTransaction : undefined}
                showUserInfo={userRole === "admin"}
                cards={cards}
                isAdmin={userRole === "admin"}
              />
            </TabsContent>
            <TabsContent value="entries" className="mt-4">
              <EntryHistory
                entries={periodFilteredEntries}
                onDeleteEntry={handleDeleteEntry}
                showUserInfo={userRole === "admin"}
              />
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

      {!hasNoCards && userRole === "admin" && (
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
      )}
    </div>
  )
}
