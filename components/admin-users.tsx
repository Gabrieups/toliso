"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  User,
  Loader2,
  Send,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from "lucide-react"
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
import { createUserAction, updateUserAction, deleteUserAction, getUsersAction } from "@/app/actions/users"
import { getUsersExpensesAction, sendIndividualExpenseReportAction } from "@/app/actions/email"
import { AddEntryModal } from "@/components/add-entry-modal"

interface AdminUser {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  createdAt: string
  status: "active" | "inactive"
}

interface UserExpense {
  id: string
  totalExpenses: number
  totalPayments: number
  balance: number
}

function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  if (day >= 16) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    return `${nextYear}-${nextMonth.toString().padStart(2, "0")}`
  } else {
    return `${year}-${month.toString().padStart(2, "0")}`
  }
}

function formatPeriodDisplay(period: string): string {
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]
  const [year, month] = period.split("-").map(Number)
  return `${monthNames[month - 1]} ${year}`
}

function navigatePeriod(currentPeriod: string, direction: "prev" | "next"): string {
  const [year, month] = currentPeriod.split("-").map(Number)
  let newMonth = direction === "next" ? month + 1 : month - 1
  let newYear = year

  if (newMonth > 12) {
    newMonth = 1
    newYear++
  } else if (newMonth < 1) {
    newMonth = 12
    newYear--
  }

  return `${newYear}-${newMonth.toString().padStart(2, "0")}`
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    status: "active" as "active" | "inactive",
  })
  const [usersExpenses, setUsersExpenses] = useState<UserExpense[]>([])
  const [sendingEmailUserId, setSendingEmailUserId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod())
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false)
  const alertModal = useAlertModal()

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    loadUsersExpenses()
  }, [selectedPeriod])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const result = await getUsersAction()
      if (result.success && result.users) {
        setUsers(result.users)
      }
      await loadUsersExpenses()
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsersExpenses = async () => {
    try {
      const expensesResult = await getUsersExpensesAction(selectedPeriod)
      if (expensesResult.success && expensesResult.usersExpenses) {
        setUsersExpenses(expensesResult.usersExpenses)
      }
    } catch (error) {
      console.error("Erro ao carregar gastos dos usuários:", error)
    }
  }

  const getUserExpense = (userId: string): UserExpense | undefined => {
    return usersExpenses.find((ue) => ue.id === userId)
  }

  const handleSendIndividualEmail = async (userId: string, userName: string) => {
    alertModal.open({
      variant: "warning",
      title: "Enviar relatório",
      message: `Deseja enviar o relatório de gastos de ${formatPeriodDisplay(selectedPeriod)} para ${userName}?`,
      showCancel: true,
      confirmText: "Enviar",
      onConfirm: async () => {
        setSendingEmailUserId(userId)
        try {
          const result = await sendIndividualExpenseReportAction(userId, selectedPeriod)

          if (result.success) {
            alertModal.open({
              variant: "success",
              message: result.message || "Relatório enviado com sucesso",
            })
          } else {
            alertModal.open({
              variant: "error",
              message: result.error || "Erro ao enviar relatório",
            })
          }
        } catch (error) {
          console.error("Erro ao enviar relatório:", error)
          alertModal.open({
            variant: "error",
            message: "Erro ao enviar relatório",
          })
        } finally {
          setSendingEmailUserId(null)
        }
      },
    })
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("email", formData.email)
    formDataObj.append("password", formData.password)
    formDataObj.append("role", formData.role)
    formDataObj.append("status", formData.status)

    try {
      const result = await createUserAction(formDataObj)
      if (result.success) {
        await loadUsers()
        setFormData({ name: "", email: "", password: "", role: "user", status: "active" })
        setIsAddModalOpen(false)
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao criar usuário",
        })
      }
    } catch (error) {
      console.error("Erro ao criar usuário:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao criar usuário",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append("name", formData.name)
    formDataObj.append("email", formData.email)
    formDataObj.append("role", formData.role)
    formDataObj.append("status", formData.status)

    try {
      const result = await updateUserAction(editingUser.id, formDataObj)
      if (result.success) {
        await loadUsers()
        setEditingUser(null)
        setFormData({ name: "", email: "", password: "", role: "user", status: "active" })
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao atualizar usuário",
        })
      }
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao atualizar usuário",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true)
    try {
      const result = await deleteUserAction(userId)
      if (result.success) {
        await loadUsers()
      } else {
        alertModal.open({
          variant: "error",
          message: result.error || "Erro ao excluir usuário",
        })
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error)
      alertModal.open({
        variant: "error",
        message: "Erro ao excluir usuário",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    })
  }

  const handlePaymentAdded = () => {
    loadUsersExpenses()
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="flex items-center justify-center gap-2 pt-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedPeriod(navigatePeriod(selectedPeriod, "prev"))}
          className="h-8 w-8 flex-shrink-0 flex items-center justify-center"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 max-w-[280px] text-center">
          <span className="text-xs sm:text-sm font-medium text-custom-text-primary dark:text-custom-text-primary-dark truncate">
            {formatPeriodDisplay(selectedPeriod)}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedPeriod(navigatePeriod(selectedPeriod, "next"))}
          className="h-8 w-8 flex-shrink-0 flex items-center justify-center"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5" />
            Lista de Usuários
          </CardTitle>
          <CardDescription className="text-sm">Total de {users.length} usuários cadastrados</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-custom-text-secondary dark:text-custom-text-secondary-dark flex-shrink-0" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Carregando usuários...</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredUsers.map((user) => {
                const userExpense = getUserExpense(user.id)
                const balance = userExpense?.balance || 0
                const totalExpenses = userExpense?.totalExpenses || 0
                const totalPayments = userExpense?.totalPayments || 0

                return (
                  <div
                    key={user.id}
                    className="flex flex-col p-3 sm:p-4 border border-custom-border dark:border-custom-border-dark rounded-lg bg-white dark:bg-custom-bg-dark space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-custom-primary text-white flex-shrink-0">
                          {user.role === "admin" ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-custom-text-primary dark:text-custom-text-primary-dark truncate">
                            {user.name}
                          </h3>
                          <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-center">
                            <span className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
                              Gastos
                            </span>
                            <p className="font-semibold text-custom-error">
                              R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="text-center">
                            <span className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
                              Pagos
                            </span>
                            <p className="font-semibold text-custom-primary">
                              R$ {totalPayments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={user.role === "admin" ? "default" : "secondary"}
                          className={user.role === "admin" ? "bg-custom-primary text-white" : ""}
                        >
                          {user.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                        <Badge
                          variant={user.status === "active" ? "default" : "destructive"}
                          className={
                            user.status === "active" ? "bg-custom-primary text-white" : "bg-custom-error text-white"
                          }
                        >
                          {user.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendIndividualEmail(user.id, user.name)}
                          disabled={isLoading || sendingEmailUserId === user.id || user.status === "inactive"}
                          title="Enviar relatório por email"
                        >
                          {sendingEmailUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>

                        <Dialog
                          open={editingUser?.id === user.id}
                          onOpenChange={(open) => !open && setEditingUser(null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} disabled={isLoading}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-md mx-auto">
                            <DialogHeader>
                              <DialogTitle>Editar Usuário</DialogTitle>
                              <DialogDescription>Altere os dados do usuário</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditUser}>
                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-name">Nome</Label>
                                  <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    disabled={isLoading}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-email">Email</Label>
                                  <Input
                                    id="edit-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    disabled={isLoading}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-role">Função</Label>
                                  <Select
                                    value={formData.role}
                                    onValueChange={(value: "admin" | "user") =>
                                      setFormData({ ...formData, role: value })
                                    }
                                    disabled={isLoading}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">Usuário</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-status">Status</Label>
                                  <Select
                                    value={formData.status}
                                    onValueChange={(value: "active" | "inactive") =>
                                      setFormData({ ...formData, status: value })
                                    }
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
                              <DialogFooter className="flex-col sm:flex-row gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setEditingUser(null)}
                                  disabled={isLoading}
                                  className="w-full sm:w-auto"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="submit"
                                  className="bg-custom-primary hover:bg-custom-primary-dark text-white w-full sm:w-auto"
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
                          className="text-custom-error hover:text-custom-error"
                          onClick={() => {
                            alertModal.open({
                              variant: "error",
                              title: "Excluir usuário",
                              message: `Tem certeza que deseja excluir o usuário ${user.name}?`,
                              showCancel: true,
                              confirmText: "Excluir",
                              onConfirm: () => handleDeleteUser(user.id),
                            })
                          }}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddEntryModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onAddEntry={handlePaymentAdded}
        isAdmin={true}
      />
    </div>
  )
}
