"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CreditCard, Hash, Pencil, Repeat, Trash2, User, Users } from "lucide-react"
import { CardBrandIcon } from "@/components/card-brand-icon"
import type { Transaction } from "@/types/transaction"
import { formatCurrency, formatDateTime } from "@toliso/core"
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

const FALLBACK_CARD = { color: "hsl(var(--primary))", type: "visa" as const }

export function TransactionHistory({
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  showUserInfo = false,
  cards = [],
  isAdmin = false,
}: TransactionHistoryProps) {
  const getCardData = (cardName: string) => {
    const card = cards.find((item) => item.name === cardName)
    return card ? { color: card.color, type: card.type } : FALLBACK_CARD
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
          <CreditCard className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">Nenhuma despesa neste período</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {showUserInfo
            ? "Nenhum usuário lançou despesas por aqui ainda."
            : "Use o botão Adicionar para registrar sua primeira despesa."}
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {transactions.map((transaction) => {
        const cardData = getCardData(transaction.cardName)

        return (
          <li
            key={transaction.id}
            /* A faixa colorida à esquerda identifica o cartão sem competir com o valor. */
            className="glass-row glass-hover list-row-cv animate-fade-in-up relative overflow-hidden rounded-lg pl-1"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: cardData.color }}
            />

            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{transaction.title}</h3>
                  {transaction.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{transaction.description}</p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <p className="tabular text-lg font-bold text-destructive">{formatCurrency(transaction.amount)}</p>
                  {transaction.originalAmount && transaction.originalAmount !== transaction.amount ? (
                    <p className="tabular text-[11px] text-muted-foreground">
                      total {formatCurrency(transaction.originalAmount)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-0"
                  style={{ backgroundColor: `${cardData.color}20`, color: cardData.color }}
                >
                  <CardBrandIcon brand={cardData.type} className="h-3.5 w-3.5" />
                  {transaction.cardName}
                </Badge>

                {transaction.isInstallment && transaction.totalInstallments && transaction.currentInstallment ? (
                  <Badge variant="outline">
                    <Hash className="h-3 w-3" />
                    {transaction.currentInstallment}/{transaction.totalInstallments}
                  </Badge>
                ) : null}

                {transaction.isShared && transaction.sharedUserNames?.length ? (
                  <Badge variant="outline" title={`Dividida com ${transaction.sharedUserNames.join(", ")}`}>
                    <Users className="h-3 w-3" />
                    Dividida ({transaction.sharedUserNames.length})
                  </Badge>
                ) : null}

                {showUserInfo && transaction.userName ? (
                  <Badge variant="outline">
                    <User className="h-3 w-3" />
                    {transaction.userName}
                  </Badge>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {formatDateTime(transaction.date)}
                </span>

                <div className="flex items-center gap-1">
                  {isAdmin && onEditTransaction ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditTransaction(transaction)}
                      aria-label={`Editar ${transaction.title}`}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${transaction.title}`}
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[95vw] max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir despesa</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-2 text-sm">
                            <p>
                              Tem certeza que deseja excluir &ldquo;{transaction.title}&rdquo;
                              {showUserInfo && transaction.userName ? ` de ${transaction.userName}` : ""}?
                            </p>
                            {transaction.isInstallment ? (
                              <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 font-medium text-destructive">
                                <Repeat className="mt-0.5 h-4 w-4 shrink-0" />
                                Todas as parcelas desta compra serão removidas.
                              </p>
                            ) : null}
                            {transaction.isShared ? (
                              <p className="flex items-start gap-2 rounded-md bg-foreground/5 p-2">
                                <Users className="mt-0.5 h-4 w-4 shrink-0" />
                                Esta despesa está dividida com outras pessoas.
                              </p>
                            ) : null}
                            <p className="text-muted-foreground">Esta ação não pode ser desfeita.</p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteTransaction(transaction.id)}
                          className="w-full bg-destructive text-destructive-foreground hover:brightness-110 sm:w-auto"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {transaction.isShared && transaction.sharedUserNames?.length ? (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Dividida com {transaction.sharedUserNames.join(", ")}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
