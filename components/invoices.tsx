"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Plus,
  Minus,
  Receipt,
  Filter,
  ChevronDown,
  ChevronUp,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { getInvoicesAction } from "@/app/actions/invoices"
import { getCardsAction } from "@/app/actions/cards"
import { deleteEntryAction } from "@/app/actions/entries"
import { AddEntryModal } from "@/components/add-entry-modal"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CardBrandIcon } from "@/components/card-brand-icon"
import { useAlertModal } from "@/hooks/use-alert-modal"
import { PeriodCalendar } from "@/components/period-calendar"

interface Invoice {
  cardId: string
  cardName: string
  cardColor: string
  cardType: "visa" | "mastercard" | "elo" | "american-express"
  dueDate: number
  closingDate: number
  period: string
  periodDisplay: string
  transactions: any[]
  totalExpenses: number
  balance: number
  paymentsApplied?: number
}

interface PaymentBlock {
  period: string
  periodDisplay: string
  entries: any[]
  totalEntries: number
}

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentBlocks, setPaymentBlocks] = useState<PaymentBlock[]>([])
  const [cards, setCards] = useState<string[]>([])
  const [selectedCard, setSelectedCard] = useState<string>("all")
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const { period } = getInvoicePeriod(new Date())
    return period
  })
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set())
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const alertModal = useAlertModal()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [invoicesResult, cardsResult] = await Promise.all([getInvoicesAction(), getCardsAction()])

      if (invoicesResult.success && invoicesResult.invoices && invoicesResult.paymentBlocks) {
        setInvoices(invoicesResult.invoices)
        setPaymentBlocks(invoicesResult.paymentBlocks)
      }

      if (cardsResult.success && cardsResult.cards) {
        const cardNames = cardsResult.cards
          .filter((card: any) => card.status === "active")
          .map((card: any) => card.name)
        setCards(cardNames)
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const result = await deleteEntryAction(entryId)
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

  const formatOrdinal = (day: number) => {
    return `${day}º`
  }

  const toggleInvoiceExpansion = (invoiceKey: string) => {
    const newExpanded = new Set(expandedInvoices)
    if (newExpanded.has(invoiceKey)) {
      newExpanded.delete(invoiceKey)
    } else {
      newExpanded.add(invoiceKey)
    }
    setExpandedInvoices(newExpanded)
  }

  const getTopBarColor = () => {
    if (selectedCard === "all") {
      return "#2ECC71"
    }

    const selectedInvoice = invoices.find((inv) => inv.cardName === selectedCard)
    return selectedInvoice?.cardColor || "#2ECC71"
  }

  const togglePaymentExpansion = (paymentKey: string) => {
    const newExpanded = new Set(expandedPayments)
    if (newExpanded.has(paymentKey)) {
      newExpanded.delete(paymentKey)
    } else {
      newExpanded.add(paymentKey)
    }
    setExpandedPayments(newExpanded)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const cardMatch = selectedCard === "all" || invoice.cardName === selectedCard
    const periodMatch = selectedPeriod === "all" || invoice.period === selectedPeriod
    return cardMatch && periodMatch
  })

  const filteredPaymentBlocks = paymentBlocks.filter((block) => {
    const periodMatch = selectedPeriod === "all" || block.period === selectedPeriod
    return periodMatch
  })

  const uniquePeriods = [...new Set([...invoices.map((inv) => inv.period), ...paymentBlocks.map((pb) => pb.period)])]
    .sort()
    .reverse()

  const getPeriodDisplayForSelect = (period: string) => {
    const { periodDisplay } = getInvoicePeriod(new Date(`${period}-01`))
    return periodDisplay
  }

  // Helper to get invoice period with year in display
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

  const getSelectedPeriodDisplay = () => {
    const invoice = invoices.find((inv) => inv.period === selectedPeriod)
    const paymentBlock = paymentBlocks.find((pb) => pb.period === selectedPeriod)
    return invoice?.periodDisplay || paymentBlock?.periodDisplay || getPeriodDisplayForSelect(selectedPeriod)
  }

  const navigateToPreviousPeriod = () => {
    const currentIndex = uniquePeriods.findIndex((p) => p === selectedPeriod)
    if (currentIndex < uniquePeriods.length - 1) {
      setSelectedPeriod(uniquePeriods[currentIndex + 1])
    }
  }

  const navigateToNextPeriod = () => {
    const currentIndex = uniquePeriods.findIndex((p) => p === selectedPeriod)
    if (currentIndex > 0) {
      setSelectedPeriod(uniquePeriods[currentIndex - 1])
    }
  }

  const isFirstPeriod = () => {
    const currentPeriod = getCurrentPeriod()
    // If we're viewing the current period OR the selected period is the most recent in the list
    return selectedPeriod === currentPeriod || selectedPeriod === uniquePeriods[0]
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

  return (
    <div className="flex flex-col space-y-4 sm:space-y-6 p-2 sm:p-4 overflow-auto">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-custom-text-primary dark:text-custom-text-primary-dark">
            Faturas
          </h1>
          <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark">
            Visualize suas faturas por período (16º ao 15º) e gerencie pagamentos
          </p>
        </div>
        <Button
          onClick={() => setIsAddEntryModalOpen(true)}
          className="bg-custom-primary hover:bg-custom-secondary-dark text-white w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Pagamento
        </Button>
      </div>

      {uniquePeriods.length > 0 && (
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
            className="flex items-center gap-2 flex-1 max-w-[280px] justify-center px-2 sm:px-4 py-2 h-10 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Calendar className="h-4 w-4 text-custom-primary flex-shrink-0" />
            <span className="font-medium text-xs sm:text-sm text-custom-text-primary dark:text-custom-text-primary-dark truncate">
              {getSelectedPeriodDisplay()}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={navigateToNextPeriod}
            disabled={isFirstPeriod()}
            className="h-10 w-10 p-0 flex-shrink-0"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      <PeriodCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        periods={uniquePeriods}
        selectedPeriod={selectedPeriod}
        onPeriodSelect={setSelectedPeriod}
        getCurrentPeriod={getCurrentPeriod}
        getInvoicePeriod={getInvoicePeriod}
      />

      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-4">
        {cards.length > 0 && (
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por cartão" />
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
        )}
      </div>

      {filteredInvoices.length === 0 && filteredPaymentBlocks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-custom-text-primary dark:text-custom-text-primary-dark mb-2">
              Nenhuma fatura encontrada
            </h3>
            <p className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
              {cards.length === 0
                ? "Cadastre cartões para começar a gerar faturas."
                : "Adicione transações para gerar suas primeiras faturas."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Payment Blocks */}
          {filteredPaymentBlocks.map((paymentBlock) => {
            const paymentKey = `payment-${paymentBlock.period}`
            const isExpanded = expandedPayments.has(paymentKey)

            return (
              <Card key={paymentKey} className="overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors pt-4"
                      onClick={() => togglePaymentExpansion(paymentKey)}
                      style={{ borderTop: `.3em solid #2ECC71` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Plus className="h-6 w-6 text-green-600" />
                              Pagamentos
                            </CardTitle>
                            <CardDescription>{paymentBlock.periodDisplay}</CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              +R$ {paymentBlock.totalEntries.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {paymentBlock.entries.length} pagamento{paymentBlock.entries.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <Plus className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Total de Pagamentos</div>
                          <div className="font-semibold text-green-600">
                            R$ {paymentBlock.totalEntries.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      <h4 className="font-semibold mb-3 text-custom-text-primary dark:text-custom-text-primary-dark">
                        Pagamentos ({paymentBlock.entries.length})
                      </h4>
                      <div className="space-y-2">
                        {paymentBlock.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">{entry.title}</div>
                              {entry.description && <div className="text-xs text-gray-500">{entry.description}</div>}
                              <div className="text-xs text-gray-500">
                                {new Date(entry.date).toLocaleDateString("pt-BR")}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Pagamento
                                </Badge>
                                {entry.userName && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                    Por: {entry.userName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-green-600 font-semibold">
                                +R$ {entry.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() =>
                                  alertModal.open({
                                    variant: "warning",
                                    title: "Excluir pagamento",
                                    message: `Tem certeza que deseja excluir o pagamento "${entry.title}"${entry.userName ? ` feito por ${entry.userName}` : ""}? Esta ação não pode ser desfeita.`,
                                    showCancel: true,
                                    confirmText: "Excluir",
                                    onConfirm: () => handleDeleteEntry(entry.id),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}

          {/* Card Invoices */}
          {filteredInvoices.map((invoice) => {
            const invoiceKey = `${invoice.cardId}-${invoice.period}`
            const isExpanded = expandedInvoices.has(invoiceKey)
            const topBarColor = selectedCard === "all" ? "#2ECC71" : invoice.cardColor

            return (
              <Card key={invoiceKey} className="overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: topBarColor }} />

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors pt-4"
                      onClick={() => toggleInvoiceExpansion(invoiceKey)}
                      style={{ borderTop: `.3em solid ${invoice.cardColor}` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <CardBrandIcon brand={invoice.cardType || "visa"} className="h-6 w-6" />
                              {invoice.cardName}
                            </CardTitle>
                            <CardDescription>
                              {invoice.periodDisplay} • Vence dia {formatOrdinal(invoice.dueDate)}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-red-600">
                              -R$ {invoice.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-500">Saldo devedor</div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <Minus className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Total Gastos</div>
                            <div className="font-semibold text-red-600">
                              R$ {invoice.totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {invoice.paymentsApplied !== undefined && invoice.paymentsApplied > 0 && (
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                              <Plus className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">Pagamentos</div>
                              <div className="font-semibold text-green-600">
                                R$ {invoice.paymentsApplied.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {invoice.transactions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 text-custom-text-primary dark:text-custom-text-primary-dark">
                            Transações ({invoice.transactions.length})
                          </h4>
                          <div className="space-y-2">
                            {invoice.transactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                              >
                                <div>
                                  <div className="font-medium text-sm">{transaction.title}</div>
                                  {transaction.description && (
                                    <div className="text-xs text-gray-500">{transaction.description}</div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {transaction.isShared && (
                                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                                        Compartilhado
                                        {transaction.sharedUserNames && transaction.sharedUserNames.length > 0 && (
                                          <span className="ml-1">({transaction.sharedUserNames.join(", ")})</span>
                                        )}
                                      </Badge>
                                    )}
                                    {transaction.isInstallment && transaction.totalInstallments && (
                                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                                        {transaction.currentInstallment}/{transaction.totalInstallments}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-red-600 font-semibold">
                                  -R$ {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}

      <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onAddEntry={loadData} />
    </div>
  )
}
