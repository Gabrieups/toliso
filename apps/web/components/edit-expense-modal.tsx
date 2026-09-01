"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, CreditCard, User } from "lucide-react"
import { editTransactionAction, getActiveUsersAction } from "@/app/actions/transactions"
import { timestampToISODate } from "@toliso/core"
import { useAlertModal } from "@/hooks/use-alert-modal"
import { DatePicker } from "@/components/ui/date-picker"

interface Transaction {
  id: string
  title: string
  description: string
  amount: number
  cardName: string
  date: string
  userId: string
  userName: string
  isInstallment?: boolean
  totalInstallments?: number
  installmentGroup?: string
}

interface EditExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onEditExpense: () => void
  transaction: Transaction | null
  cards: string[]
}

interface ActiveUser {
  id: string
  name: string
  email: string
}

export function EditExpenseModal({ isOpen, onClose, onEditExpense, transaction, cards }: EditExpenseModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    card: "",
    date: "",
    targetUserId: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const alertModal = useAlertModal()

  useEffect(() => {
    if (isOpen) {
      loadActiveUsers()
    }
  }, [isOpen])

  const loadActiveUsers = async () => {
    try {
      const result = await getActiveUsersAction()
      if (result.success && result.users) {
        setActiveUsers(result.users)
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
    }
  }

  useEffect(() => {
    if (transaction && isOpen) {
      let cleanTitle = transaction.title
      if (transaction.isInstallment && transaction.totalInstallments) {
        cleanTitle = transaction.title.replace(/ $$\d+\/\d+$$$/, "")
      }

      setFormData({
        title: cleanTitle,
        description: transaction.description || "",
        amount: transaction.amount.toString().replace(".", ","),
        card: transaction.cardName,
        date: timestampToISODate(transaction.date),
        targetUserId: transaction.userId,
      })
    }
  }, [transaction, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.amount || !formData.card || !transaction) {
      return
    }

    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("title", formData.title)
    formDataObj.append("description", formData.description)
    formDataObj.append("amount", formData.amount)
    formDataObj.append("card", formData.card)
    formDataObj.append("date", formData.date)
    formDataObj.append("targetUserId", formData.targetUserId)

    try {
      const result = await editTransactionAction(transaction.id, formDataObj)
      if (result.success) {
        resetForm()
        onEditExpense()
        onClose()
        alertModal.open({
          variant: "success",
          message: result.message || "Despesa atualizada com sucesso",
        })
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao atualizar despesa",
        })
      }
    } catch (error) {
      alertModal.open({
        variant: "error",
        message: "Erro ao atualizar despesa",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      amount: "",
      card: "",
      date: "",
      targetUserId: "",
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!transaction) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Editar Despesa
          </DialogTitle>
          <DialogDescription>
            Atualize os dados da despesa selecionada.
            {transaction.isInstallment && transaction.totalInstallments && (
              <span className="block mt-2 text-yellow-600 font-medium">
                ⚠️ Esta despesa é parcelada ({transaction.totalInstallments}x). Todas as parcelas serão atualizadas
                proporcionalmente.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetUserId" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Usuário Responsável *
              </Label>
              <Select
                value={formData.targetUserId}
                onValueChange={(value) => setFormData({ ...formData, targetUserId: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Almoço no restaurante"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Detalhes adicionais sobre a despesa (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor {transaction.isInstallment ? "por parcela" : ""} *</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.,]/g, "")
                  setFormData({ ...formData, amount: value })
                }}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card">Cartão Usado *</Label>
              <Select
                value={formData.card}
                onValueChange={(value) => setFormData({ ...formData, card: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card} value={card}>
                      {card}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data da {transaction.isInstallment ? "primeira parcela" : "despesa"} *
              </Label>
              <DatePicker
                id="date"
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                disabled={isLoading}
              />
              {transaction.isInstallment && (
                <p className="text-xs text-muted-foreground">
                  As demais parcelas serão ajustadas automaticamente com base nesta data
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
             
              disabled={isLoading}
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
