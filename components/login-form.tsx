"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Eye, EyeOff, Loader2 } from "lucide-react"
import { ThemeToggleCompact } from "@/components/theme-toggle-compact"
import { loginAction } from "@/app/actions/auth"

interface LoginFormProps {
  onLogin: (user: { id: string; email: string; name: string; role: "admin" | "user" }) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    try {
      const result = await loginAction(formData)

      if (result.error) {
        setError(result.error)
      } else if (result.success && result.user) {
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("userEmail", result.user.email)
        localStorage.setItem("userName", result.user.name)
        localStorage.setItem("userRole", result.user.role)

        onLogin(result.user)
      }
    } catch (error) {
      console.error("Erro no login:", error)
      setError("Erro inesperado. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header com botão de tema */}
      <div className="flex justify-end p-4">
        <ThemeToggleCompact />
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white dark:bg-custom-bg-dark border-custom-border dark:border-custom-border-dark">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-custom-primary dark:bg-custom-primary-dark rounded-full">
                <CreditCard className="h-2 w-2 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-custom-text-primary dark:text-custom-text-primary-dark">
              To Liso
            </CardTitle>
            <CardDescription className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
              Faça login para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="seu@email.com" required disabled={isLoading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-custom-primary hover:bg-custom-primary-dark text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-custom-text-secondary dark:text-custom-text-secondary-dark">
                Não tem uma conta? Entre em contato com o administrador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
