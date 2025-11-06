"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Search, Edit, Trash2, Shield, User, Mail, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { createUserAction, updateUserAction, deleteUserAction, getUsersAction } from "@/app/actions/users"

interface AdminUser {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  createdAt: string
  status: "active" | "inactive"
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
  const [isSendingEmails, setIsSendingEmails] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const result = await getUsersAction()
      if (result.success && result.users) {
        setUsers(result.users)
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
    } finally {
      setIsLoading(false)
    }
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
        alert(result.error || "Erro ao criar usuário")
      }
    } catch (error) {
      console.error("Erro ao criar usuário:", error)
      alert("Erro ao criar usuário")
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
        alert(result.error || "Erro ao atualizar usuário")
      }
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error)
      alert("Erro ao atualizar usuário")
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
        alert(result.error || "Erro ao excluir usuário")
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error)
      alert("Erro ao excluir usuário")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendExpenseReport = async () => {
    if (!confirm("Deseja enviar o relatório de gastos para todos os usuários ativos?")) {
      return
    }

    setIsSendingEmails(true)
    try {
      const { sendExpenseReportAction } = await import("@/app/actions/email")
      const result = await sendExpenseReportAction()

      if (result.success) {
        alert(result.message)
      } else {
        alert(result.error || "Erro ao enviar relatórios")
      }
    } catch (error) {
      console.error("Erro ao enviar relatórios:", error)
      alert("Erro ao enviar relatórios")
    } finally {
      setIsSendingEmails(false)
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

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-custom-text-primary dark:text-custom-text-primary-dark">
            Gerenciar Usuários
          </h1>
          <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark">
            Administre os usuários do sistema
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleSendExpenseReport}
            disabled={isLoading || isSendingEmails}
            className="bg-custom-secondary hover:bg-custom-secondary-dark text-white w-full sm:w-auto"
          >
            {isSendingEmails ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Relatório
              </>
            )}
          </Button>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-custom-primary hover:bg-custom-primary-dark text-white w-full sm:w-auto"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddUser}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "admin" | "user") => setFormData({ ...formData, role: value })}
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
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
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
                    onClick={() => setIsAddModalOpen(false)}
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
                    {isLoading ? "Criando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-custom-border dark:border-custom-border-dark rounded-lg bg-white dark:bg-custom-bg-dark space-y-3 sm:space-y-0"
                >
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

                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="flex space-x-2">
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
                      <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
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
                                  onValueChange={(value: "admin" | "user") => setFormData({ ...formData, role: value })}
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

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-custom-error hover:text-custom-error-dark"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o usuário "{user.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-custom-error hover:bg-custom-error-dark text-white w-full sm:w-auto"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
