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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Users, X, CreditCard, Calendar, DollarSign, Repeat } from "lucide-react"
import { createTransactionAction, getActiveUsersAction } from "@/app/actions/transactions"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onAddExpense: () => void
  cards: string[]
}

interface User {
  id: string
  name: string
  email: string
}

interface UserShare {
  userId: string
  userName: string
  amount: string
}

type DivisionType = "equal" | "custom"

export function AddExpenseModal({ isOpen, onClose, onAddExpense, cards }: AddExpenseModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    card: "",
    installments: 1,
    isShared: false,
    isRecurring: false,
  })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [divisionType, setDivisionType] = useState<DivisionType>("equal")
  const [userShares, setUserShares] = useState<UserShare[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  // Atualizar shares quando usuários ou tipo de divisão mudam
  useEffect(() => {
    if (formData.isShared && selectedUsers.length > 0) {
      const currentUserEmail = localStorage.getItem("userEmail")
      const currentUserName = localStorage.getItem("userName") || "Você"

      // Adicionar o usuário atual
      const allUserIds = [currentUserEmail!, ...selectedUsers]
      const allUserNames = [
        currentUserName,
        ...availableUsers.filter((u) => selectedUsers.includes(u.id)).map((u) => u.name),
      ]

      if (divisionType === "equal") {
        // Divisão igual
        const totalAmount = Number.parseFloat(formData.amount.replace(",", ".")) || 0
        const amountPerUser = totalAmount / allUserIds.length

        setUserShares(
          allUserIds.map((userId, index) => ({
            userId,
            userName: allUserNames[index],
            amount: amountPerUser.toFixed(2),
          })),
        )
      } else if (userShares.length === 0 || userShares.length !== allUserIds.length) {
        // Inicializar divisão customizada
        setUserShares(
          allUserIds.map((userId, index) => ({
            userId,
            userName: allUserNames[index],
            amount: "0.00",
          })),
        )
      }
    } else {
      setUserShares([])
    }
  }, [formData.isShared, selectedUsers, divisionType, formData.amount, availableUsers])

  const loadUsers = async () => {
    try {
      const result = await getActiveUsersAction()
      if (result.success && result.users) {
        const currentUserEmail = localStorage.getItem("userEmail")
        const otherUsers = result.users.filter((user: User) => user.email !== currentUserEmail)
        setAvailableUsers(otherUsers)
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.amount || !formData.card) {
      return
    }

    if (formData.isShared && selectedUsers.length === 0) {
      alert("Selecione pelo menos um usuário para compartilhar a despesa")
      return
    }

    if (formData.isShared && divisionType === "custom") {
      const totalShares = userShares.reduce((sum, share) => sum + Number.parseFloat(share.amount || "0"), 0)
      const totalAmount = Number.parseFloat(formData.amount.replace(",", "."))

      if (Math.abs(totalShares - totalAmount) > 0.01) {
        alert(
          `A soma dos valores individuais (R$ ${totalShares.toFixed(2)}) não corresponde ao valor total (R$ ${totalAmount.toFixed(2)})`,
        )
        return
      }
    }

    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("title", formData.title)
    formDataObj.append("description", formData.description)
    formDataObj.append("amount", formData.amount)
    formDataObj.append("card", formData.card)
    formDataObj.append("installments", formData.installments.toString())
    formDataObj.append("isShared", formData.isShared.toString())
    formDataObj.append("isRecurring", formData.isRecurring.toString())
    formDataObj.append("divisionType", divisionType)

    if (formData.isShared) {
      if (divisionType === "equal") {
        formDataObj.append("sharedUserIds", JSON.stringify(selectedUsers))
      } else {
        formDataObj.append("customShares", JSON.stringify(userShares))
      }
    }

    try {
      const result = await createTransactionAction(formDataObj)
      if (result.success) {
        resetForm()
        onAddExpense()
        onClose()
        if (result.message) {
          alert(result.message)
        }
      } else {
        alert(result.error || "Erro ao criar transação")
      }
    } catch (error) {
      console.error("Erro ao criar transação:", error)
      alert("Erro ao criar transação")
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
      installments: 1,
      isShared: false,
      isRecurring: false,
    })
    setSelectedUsers([])
    setUserShares([])
    setDivisionType("equal")
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((id) => id !== userId))
  }

  const updateUserShare = (userId: string, amount: string) => {
    setUserShares((prev) => prev.map((share) => (share.userId === userId ? { ...share, amount } : share)))
  }

  const getSelectedUserNames = () => {
    return availableUsers.filter((user) => selectedUsers.includes(user.id)).map((user) => user.name)
  }

  const calculateEqualShare = () => {
    if (!formData.amount || !formData.isShared) return null
    const totalUsers = selectedUsers.length + 1
    const amount = Number.parseFloat(formData.amount.replace(",", "."))
    if (isNaN(amount) || totalUsers === 0) return null
    return (amount / totalUsers).toFixed(2)
  }

  const calculateCustomTotal = () => {
    return userShares.reduce((sum, share) => sum + Number.parseFloat(share.amount || "0"), 0).toFixed(2)
  }

  const calculateInstallmentAmount = () => {
    if (!formData.amount) return null
    const amount = Number.parseFloat(formData.amount.replace(",", "."))
    if (isNaN(amount)) return null
    return (amount / formData.installments).toFixed(2)
  }

  const getTotalUsers = () => selectedUsers.length + 1

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Adicionar Nova Despesa
          </DialogTitle>
          <DialogDescription>Preencha os dados da sua nova despesa no cartão de crédito.</DialogDescription>
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
              <Label htmlFor="amount">Valor Total *</Label>
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
              <Label htmlFor="installments" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Número de Parcelas
              </Label>
              <Select
                value={formData.installments.toString()}
                onValueChange={(value) => setFormData({ ...formData, installments: Number.parseInt(value) })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}x {num === 1 ? "(À vista)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {calculateInstallmentAmount() && formData.installments > 1 && (
                <p className="text-xs text-blue-600">R$ {calculateInstallmentAmount()} por parcela</p>
              )}
            </div>

            {/* Despesa constante */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked as boolean })}
                  disabled={isLoading}
                />
                <Label htmlFor="isRecurring" className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Despesa constante (mensal)
                </Label>
              </div>
              {formData.isRecurring && (
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  Esta despesa será adicionada automaticamente todos os meses.
                </div>
              )}
            </div>

            {/* Divisão entre usuários */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isShared"
                  checked={formData.isShared}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, isShared: checked as boolean })
                    if (!checked) {
                      setSelectedUsers([])
                      setUserShares([])
                    }
                  }}
                  disabled={isLoading}
                />
                <Label htmlFor="isShared" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Dividir entre usuários
                </Label>
              </div>

              {formData.isShared && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Selecione os usuários para dividir esta despesa:
                  </div>

                  {/* Usuários selecionados */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {getSelectedUserNames().map((userName, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {userName}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-red-500"
                            onClick={() => removeUser(selectedUsers[index])}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Lista de usuários disponíveis */}
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                    {availableUsers.length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhum outro usuário disponível</p>
                    ) : (
                      availableUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            disabled={isLoading}
                          />
                          <Label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
                            {user.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedUsers.length > 0 && (
                    <>
                      {/* Tipo de divisão */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Tipo de Divisão
                        </Label>
                        <RadioGroup
                          value={divisionType}
                          onValueChange={(value) => setDivisionType(value as DivisionType)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="equal" id="equal" />
                            <Label htmlFor="equal" className="cursor-pointer">
                              Dividir igualmente
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom" className="cursor-pointer">
                              Valores personalizados
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Divisão igual */}
                      {divisionType === "equal" && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          A despesa será dividida igualmente entre você e {selectedUsers.length} usuário
                          {selectedUsers.length > 1 ? "s" : ""} selecionado{selectedUsers.length > 1 ? "s" : ""}. Cada
                          um pagará R$ {calculateEqualShare()}.
                        </div>
                      )}

                      {/* Divisão personalizada */}
                      {divisionType === "custom" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Valores por usuário:</Label>
                          <div className="border rounded-md p-3 space-y-2 bg-gray-50 dark:bg-gray-800">
                            {userShares.map((share, index) => (
                              <div key={share.userId} className="flex items-center gap-2">
                                <Label className="text-sm w-32 truncate">{share.userName}:</Label>
                                <div className="flex items-center gap-1 flex-1">
                                  <span className="text-sm">R$</span>
                                  <Input
                                    type="text"
                                    value={share.amount}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9.,]/g, "")
                                      updateUserShare(share.userId, value)
                                    }}
                                    placeholder="0.00"
                                    className="h-8"
                                    disabled={isLoading}
                                  />
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 border-t flex items-center justify-between text-sm">
                              <span className="font-medium">Total:</span>
                              <span
                                className={
                                  Math.abs(
                                    Number.parseFloat(calculateCustomTotal()) -
                                      Number.parseFloat(formData.amount.replace(",", ".")),
                                  ) > 0.01
                                    ? "text-red-600 font-medium"
                                    : "text-green-600 font-medium"
                                }
                              >
                                R$ {calculateCustomTotal()}
                              </span>
                            </div>
                            {Math.abs(
                              Number.parseFloat(calculateCustomTotal()) -
                                Number.parseFloat(formData.amount.replace(",", ".")),
                            ) > 0.01 && (
                              <p className="text-xs text-red-600">
                                ⚠️ A soma deve ser igual ao valor total (R$ {formData.amount})
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
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
              {isLoading ? "Adicionando..." : "Adicionar Despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
