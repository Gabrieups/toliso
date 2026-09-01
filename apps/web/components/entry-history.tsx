"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Trash2, User, Wallet } from "lucide-react"
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

interface Entry {
  id: string
  title: string
  description: string
  amount: number
  date: string
  userId?: string
  userName?: string
  userEmail?: string
}

interface EntryHistoryProps {
  entries: Entry[]
  onDeleteEntry: (id: string) => void
  showUserInfo?: boolean
}

export function EntryHistory({ entries, onDeleteEntry, showUserInfo = false }: EntryHistoryProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
          <Wallet className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">Nenhum pagamento neste período</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {showUserInfo
            ? "Nenhum usuário registrou pagamentos por aqui ainda."
            : "Registre um pagamento para abater o saldo do período."}
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="glass-row glass-hover list-row-cv animate-fade-in-up relative overflow-hidden rounded-lg pl-1"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />

          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold">{entry.title}</h3>
                {entry.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.description}</p>
                ) : null}
              </div>

              <p className="tabular shrink-0 text-lg font-bold text-primary">+{formatCurrency(entry.amount)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-0 bg-primary/12 text-primary">
                <Wallet className="h-3 w-3" />
                Pagamento
              </Badge>

              {showUserInfo && entry.userName ? (
                <Badge variant="outline">
                  <User className="h-3 w-3" />
                  {entry.userName}
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDateTime(entry.date)}
              </span>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${entry.title}`}
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[95vw] max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir pagamento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir &ldquo;{entry.title}&rdquo;
                      {showUserInfo && entry.userName ? ` de ${entry.userName}` : ""}? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteEntry(entry.id)}
                      className="w-full bg-destructive text-destructive-foreground hover:brightness-110 sm:w-auto"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
