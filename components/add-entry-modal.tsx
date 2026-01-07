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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createEntryAction } from "@/app/actions/entries"
import { useAlertModal } from "@/hooks/use-alert-modal"
import { getActiveUsersAction } from "@/app/actions/transactions"

interface AddEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onAddEntry: () => void
  isAdmin?: boolean
}

interface User {
  id: string
  name: string
  email: string
}

export function AddEntryModal({ isOpen, onClose, onAddEntry, isAdmin = false }: AddEntryModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    targetUserId: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const alertModal = useAlertModal()

  useEffect(() => {
    if (isAdmin && isOpen) {
      loadUsers()
    }
  }, [isAdmin, isOpen])

  const loadUsers = async () => {
    try {
      const result = await getActiveUsersAction()
      if (result.success && result.users) {
        setUsers(result.users)
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.amount) {
      return
    }

    if (isAdmin && !formData.targetUserId) {
      alertModal.open({
        variant: "error",
        message: "Selecione um usuário para registrar o pagamento",
      })
      return
    }

    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("title", formData.title)
    formDataObj.append("description", formData.description)
    formDataObj.append("amount", formData.amount)

    try {
      const result = await createEntryAction(formDataObj, isAdmin ? formData.targetUserId : undefined)
      if (result.success) {
        setFormData({
          title: "",
          description: "",
          amount: "",
          targetUserId: "",
        })
        onAddEntry()
        onClose()
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao criar pagamento",
        })
      }
    } catch (error) {
      console.error("Erro ao criar pagamento:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao criar pagamento",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      amount: "",
      targetUserId: "",
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Pagamento</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Registre um pagamento para um usuário."
              : "Registre um pagamento que será distribuído proporcionalmente entre seus cartões."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="targetUser">Usuário *</Label>
                <Select
                  value={formData.targetUserId}
                  onValueChange={(value) => setFormData({ ...formData, targetUserId: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Pagamento da fatura"
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
                placeholder="Detalhes adicionais sobre o pagamento (opcional)"
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
                onKeyPress={(e) => {
                  if (!/[0-9.,]/.test(e.key) && !["Backspace", "Delete", "Tab", "Enter"].includes(e.key)) {
                    e.preventDefault()
                  }
                }}
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
              className="bg-custom-secondary hover:bg-custom-secondary-dark text-white"
              disabled={isLoading}
            >
              {isLoading ? "Adicionando..." : "Adicionar Pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
