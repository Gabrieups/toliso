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
import { Calendar, CreditCard } from "lucide-react"
import { editTransactionAction } from "@/app/actions/transactions"
import { useAlertModal } from "@/hooks/use-alert-modal"

interface Transaction {
  id: string
  title: string
  description: string
  amount: number
  cardName: string
  date: string
}

interface EditExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onEditExpense: () => void
  transaction: Transaction | null
  cards: string[]
}

export function EditExpenseModal({ isOpen, onClose, onEditExpense, transaction, cards }: EditExpenseModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    card: "",
    date: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const alertModal = useAlertModal()

  useEffect(() => {
    if (transaction && isOpen) {
      setFormData({
        title: transaction.title,
        description: transaction.description || "",
        amount: transaction.amount.toString().replace(".", ","),
        card: transaction.cardName,
        date: transaction.date.split("T")[0],
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
          <DialogDescription>Atualize os dados da despesa selecionada.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="amount">Valor *</Label>
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
                Data da Despesa *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-custom-primary hover:bg-custom-primary-dark text-white"
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
