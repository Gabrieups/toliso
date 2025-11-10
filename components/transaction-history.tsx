"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, CreditCard, User, Users, Hash, Pencil } from "lucide-react"
import { CardBrandIcon } from "@/components/card-brand-icon"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Transaction {
  id: string
  title: string
  description: string
  amount: number
  originalAmount?: number
  cardName: string
  date: string
  userId?: string
  userName?: string
  userEmail?: string
  isInstallment?: boolean
  totalInstallments?: number
  currentInstallment?: number
  isShared?: boolean
  sharedUserNames?: string[]
}

interface CardData {
  id: string
  name: string
  color: string
  type: "visa" | "mastercard" | "elo" | "american-express"
}

interface TransactionHistoryProps {
  transactions: Transaction[]
  onDeleteTransaction: (id: string) => void
  onEditTransaction?: (transaction: Transaction) => void
  showUserInfo?: boolean
  cards?: CardData[]
  isAdmin?: boolean
}

export function TransactionHistory({
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  showUserInfo = false,
  cards = [],
  isAdmin = false,
}: TransactionHistoryProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getCardData = (cardName: string) => {
    const card = cards.find((c) => c.name === cardName)
    if (card) {
      return {
        color: card.color,
        type: card.type,
        style: {
          backgroundColor: card.color,
          color: "#ffffff",
        },
      }
    }

    return {
      color: "#3b82f6",
      type: "visa" as const,
      style: {
        backgroundColor: "#3b82f6",
        color: "#ffffff",
      },
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <CreditCard className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-custom-text-primary dark:text-custom-text-primary-dark mb-2">
          Nenhuma transação encontrada
        </h3>
        <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark">
          {showUserInfo
            ? "Nenhum usuário criou transações ainda."
            : "Adicione sua primeira despesa para começar a controlar seus gastos."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {transactions.map((transaction) => {
        const cardData = getCardData(transaction.cardName)

        return (
          <div
            key={transaction.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-custom-border dark:border-custom-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-custom-border-dark/20 transition-colors bg-white dark:bg-custom-bg-dark space-y-3 sm:space-y-0"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                <h3 className="text-sm font-medium text-custom-text-primary dark:text-custom-text-primary-dark truncate">
                  {transaction.title}
                </h3>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold text-red-600">
                    R$ {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {transaction.description && (
                <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark mb-2 line-clamp-2">
                  {transaction.description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge style={cardData.style} className="border-0 flex items-center gap-1">
                    <CardBrandIcon brand={cardData.type} className="h-4 w-4" />
                    {transaction.cardName}
                  </Badge>

                  {transaction.isInstallment && transaction.totalInstallments && transaction.currentInstallment && (
                    <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-200">
                      <Hash className="h-3 w-3" />
                      {transaction.currentInstallment}/{transaction.totalInstallments}
                    </Badge>
                  )}

                  {transaction.isShared && transaction.sharedUserNames && (
                    <Badge variant="outline" className="flex items-center gap-1 text-purple-600 border-purple-200">
                      <Users className="h-3 w-3" />
                      Compartilhado ({transaction.sharedUserNames.length})
                    </Badge>
                  )}

                  {showUserInfo && transaction.userName && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {transaction.userName}
                    </Badge>
                  )}

                  <div className="flex items-center text-xs text-custom-text-secondary dark:text-custom-text-secondary-dark">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(transaction.date)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && onEditTransaction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTransaction(transaction)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 self-end sm:self-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir transação</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a transação "{transaction.title}"
                          {showUserInfo && transaction.userName && ` criada por ${transaction.userName}`}?
                          {transaction.isInstallment && (
                            <span className="block mt-2 text-orange-600 font-medium">
                              ⚠️ Esta ação excluirá TODAS as parcelas desta compra.
                            </span>
                          )}
                          {transaction.isShared && (
                            <span className="block mt-2 text-purple-600 font-medium">
                              👥 Esta transação é compartilhada com outros usuários.
                            </span>
                          )}
                          <span className="block mt-2">Esta ação não pode ser desfeita.</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteTransaction(transaction.id)}
                          className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {transaction.isShared && transaction.sharedUserNames && transaction.sharedUserNames.length > 0 && (
                <div className="mt-2 pt-2 border-t border-custom-border dark:border-custom-border-dark">
                  <p className="text-xs text-custom-text-secondary dark:text-custom-text-secondary-dark flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Dividido com: {transaction.sharedUserNames.join(", ")}
                  </p>
                </div>
              )}

              {showUserInfo && transaction.userEmail && (
                <div className="mt-2 pt-2 border-t border-custom-border dark:border-custom-border-dark">
                  <p className="text-xs text-custom-text-secondary dark:text-custom-text-secondary-dark">
                    Email: {transaction.userEmail}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
