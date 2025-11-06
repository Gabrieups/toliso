"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, User, DollarSign } from "lucide-react"
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

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-custom-text-primary dark:text-custom-text-primary-dark mb-2">
          Nenhum pagamento encontrado
        </h3>
        <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark">
          {showUserInfo
            ? "Nenhum usuário registrou pagamentos ainda."
            : "Adicione seu primeiro pagamento para começar a controlar seus créditos."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-custom-border dark:border-custom-border-dark rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors bg-white dark:bg-custom-bg-dark space-y-3 sm:space-y-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
              <h3 className="text-sm font-medium text-custom-text-primary dark:text-custom-text-primary-dark truncate">
                {entry.title}
              </h3>
              <span className="text-lg font-bold text-green-600">
                +R$ {entry.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {entry.description && (
              <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark mb-2 line-clamp-2">
                {entry.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-custom-secondary text-white border-0">Pagamento</Badge>

                {showUserInfo && entry.userName && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.userName}
                  </Badge>
                )}

                <div className="flex items-center text-xs text-custom-text-secondary dark:text-custom-text-secondary-dark">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(entry.date)}
                </div>
              </div>

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
                    <AlertDialogTitle>Excluir pagamento</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o pagamento "{entry.title}"
                      {showUserInfo && entry.userName && ` criado por ${entry.userName}`}? Esta ação não pode ser
                      desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteEntry(entry.id)}
                      className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Informações adicionais do usuário para admin */}
            {showUserInfo && entry.userEmail && (
              <div className="mt-2 pt-2 border-t border-custom-border dark:border-custom-border-dark">
                <p className="text-xs text-custom-text-secondary dark:text-custom-text-secondary-dark">
                  Email: {entry.userEmail}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
