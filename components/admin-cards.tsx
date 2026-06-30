"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Plus, Search, Edit, Trash2, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAlertModal } from "@/hooks/use-alert-modal"
import { useSyncContext } from "@/contexts/sync-context"
import { createCardAction, updateCardAction, deleteCardAction, getCardsAction } from "@/app/actions/cards"
import { CardBrandIcon } from "@/components/card-brand-icon"

interface CreditCardData {
  id: string
  name: string
  bank: string
  type: "visa" | "mastercard" | "elo" | "american-express"
  color: string
  status: "active" | "inactive"
  dueDate: number
  closingDate: number
  createdAt: string
}

export function AdminCards() {
  const [cards, setCards] = useState<CreditCardData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    bank: "",
    type: "visa" as "visa" | "mastercard" | "elo" | "american-express",
    color: "#2ECC71",
    status: "active" as "active" | "inactive",
    dueDate: 10,
    closingDate: 5,
  })
  const alertModal = useAlertModal()
  const { registerSyncCallback, unregisterSyncCallback } = useSyncContext()

  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1)

  const loadCards = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getCardsAction()
      if (result.success && result.cards) {
        setCards(result.cards)
      } else {
        setCards([])
      }
    } catch (error) {
      console.error("Erro ao carregar cartões:", error)
      setCards([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  useEffect(() => {
    registerSyncCallback("admin-cards", loadCards)
    return () => unregisterSyncCallback("admin-cards")
  }, [registerSyncCallback, unregisterSyncCallback, loadCards])

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("bank", formData.bank)
    formDataObj.append("type", formData.type)
    formDataObj.append("color", formData.color)
    formDataObj.append("status", formData.status)
    formDataObj.append("dueDate", formData.dueDate.toString())
    formDataObj.append("closingDate", formData.closingDate.toString())

    try {
      const result = await createCardAction(formDataObj)
      if (result.success) {
        await loadCards()
        setFormData({
          name: "",
          bank: "",
          type: "visa",
          color: "#2ECC71",
          status: "active",
          dueDate: 10,
          closingDate: 5,
        })
        setIsAddModalOpen(false)
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao criar cartão",
        })
      }
    } catch (error) {
      console.error("Erro ao criar cartão:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao criar cartão",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCard) return

    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("bank", formData.bank)
    formDataObj.append("type", formData.type)
    formDataObj.append("color", formData.color)
    formDataObj.append("status", formData.status)
    formDataObj.append("dueDate", formData.dueDate.toString())
    formDataObj.append("closingDate", formData.closingDate.toString())

    try {
      const result = await updateCardAction(editingCard.id, formDataObj)
      if (result.success) {
        await loadCards()
        setEditingCard(null)
        setFormData({
          name: "",
          bank: "",
          type: "visa",
          color: "#2ECC71",
          status: "active",
          dueDate: 10,
          closingDate: 5,
        })
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao atualizar cartão",
        })
      }
    } catch (error) {
      console.error("Erro ao atualizar cartão:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao atualizar cartão",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    setIsLoading(true)
    try {
      const result = await deleteCardAction(cardId)
      if (result.success) {
        await loadCards()
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao excluir cartão",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir cartão:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao excluir cartão",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCards = cards.filter(
    (card) =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.bank.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const openEditModal = (card: CreditCardData) => {
    setEditingCard(card)
    setFormData({
      name: card.name,
      bank: card.bank,
      type: card.type,
      color: card.color,
      status: card.status,
      dueDate: card.dueDate,
      closingDate: card.closingDate,
    })
  }

  const formatOrdinal = (day: number) => {
    return `${day}º`
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-custom-text-primary dark:text-custom-text-primary-dark">
            Gerenciar Cartões
          </h1>
          <p className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
            Administre os cartões de crédito do sistema
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-custom-primary hover:bg-custom-primary-dark text-white" disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cartão</DialogTitle>
              <DialogDescription>Preencha os dados do novo cartão de crédito</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCard}>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cartão</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Nubank Roxinho"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco</Label>
                  <Input
                    id="bank"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    placeholder="Ex: Nubank"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Bandeira</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="mastercard">Mastercard</SelectItem>
                      <SelectItem value="elo">Elo</SelectItem>
                      <SelectItem value="american-express">American Express</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      disabled={isLoading}
                      className="w-12 h-10 rounded border border-custom-border dark:border-custom-border-dark cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#2ECC71"
                      disabled={isLoading}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingDate">Data de Fechamento</Label>
                  <Select
                    value={formData.closingDate.toString()}
                    onValueChange={(value) => setFormData({ ...formData, closingDate: Number.parseInt(value) })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {formatOrdinal(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Data de Vencimento</Label>
                  <Select
                    value={formData.dueDate.toString()}
                    onValueChange={(value) => setFormData({ ...formData, dueDate: Number.parseInt(value) })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {formatOrdinal(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-custom-primary hover:bg-custom-primary-dark text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Criando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Lista de Cartões
          </CardTitle>
          <CardDescription>
            {cards.length === 0 ? "Nenhum cartão cadastrado" : `Total de ${cards.length} cartões cadastrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cards.length > 0 && (
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-4 w-4 text-custom-text-secondary dark:text-custom-text-secondary-dark" />
              <Input
                placeholder="Buscar cartões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">Carregando cartões...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-custom-text-primary dark:text-custom-text-primary-dark mb-2">
                Nenhum cartão cadastrado
              </h3>
              <p className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
                Adicione seu primeiro cartão de crédito para começar a controlar seus gastos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card) => (
                <Card
                  key={card.id}
                  className="relative overflow-hidden bg-white dark:bg-custom-bg-dark border-custom-border dark:border-custom-border-dark"
                >
                  <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: card.color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{card.name}</CardTitle>
                      <Badge
                        variant={card.status === "active" ? "default" : "destructive"}
                        className={
                          card.status === "active" ? "bg-custom-primary text-white" : "bg-custom-error text-white"
                        }
                      >
                        {card.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <CardDescription>{card.bank}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
                          Bandeira:
                        </span>
                        <span className="capitalize font-medium flex items-center gap-1">
                          <CardBrandIcon brand={card.type} className="h-4 w-4" />
                          {card.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
                          Fechamento:
                        </span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Dia {formatOrdinal(card.closingDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
                          Vencimento:
                        </span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Dia {formatOrdinal(card.dueDate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-1">
                      <Dialog open={editingCard?.id === card.id} onOpenChange={(open) => !open && setEditingCard(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(card)} disabled={isLoading}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Editar Cartão</DialogTitle>
                            <DialogDescription>Altere os dados do cartão</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleEditCard}>
                            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome do Cartão</Label>
                                <Input
                                  id="edit-name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  required
                                  disabled={isLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-bank">Banco</Label>
                                <Input
                                  id="edit-bank"
                                  value={formData.bank}
                                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                                  required
                                  disabled={isLoading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-type">Bandeira</Label>
                                <Select
                                  value={formData.type}
                                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                                  disabled={isLoading}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="visa">Visa</SelectItem>
                                    <SelectItem value="mastercard">Mastercard</SelectItem>
                                    <SelectItem value="elo">Elo</SelectItem>
                                    <SelectItem value="american-express">American Express</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-color">Cor</Label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="color"
                                    id="edit-color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    disabled={isLoading}
                                    className="w-12 h-10 rounded border border-custom-border dark:border-custom-border-dark cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <Input
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="#2ECC71"
                                    disabled={isLoading}
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-closingDate">Data de Fechamento</Label>
                                <Select
                                  value={formData.closingDate.toString()}
                                  onValueChange={(value) =>
                                    setFormData({ ...formData, closingDate: Number.parseInt(value) })
                                  }
                                  disabled={isLoading}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dayOptions.map((day) => (
                                      <SelectItem key={day} value={day.toString()}>
                                        Dia {formatOrdinal(day)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-dueDate">Data de Vencimento</Label>
                                <Select
                                  value={formData.dueDate.toString()}
                                  onValueChange={(value) =>
                                    setFormData({ ...formData, dueDate: Number.parseInt(value) })
                                  }
                                  disabled={isLoading}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dayOptions.map((day) => (
                                      <SelectItem key={day} value={day.toString()}>
                                        Dia {formatOrdinal(day)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                  value={formData.status}
                                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                                  disabled={isLoading}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="inactive">Inativo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingCard(null)}
                                disabled={isLoading}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                className="bg-custom-primary hover:bg-custom-primary-dark text-white"
                                disabled={isLoading}
                              >
                                {isLoading ? "Salvando..." : "Salvar"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-custom-error hover:text-custom-error-dark"
                        disabled={isLoading}
                        onClick={() =>
                          alertModal.open({
                            variant: "warning",
                            title: "Excluir cartão",
                            message: `Tem certeza que deseja excluir o cartão "${card.name}"? Esta ação não pode ser desfeita.`,
                            showCancel: true,
                            confirmText: "Excluir",
                            onConfirm: () => handleDeleteCard(card.id),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
