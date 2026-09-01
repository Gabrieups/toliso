"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "@/contexts/theme-context"
import { Bell, Check, Monitor, Moon, Shield, Smartphone, Sun, User } from "lucide-react"
import { getInitials } from "@toliso/core"

interface SettingsProps {
  userName: string
  userRole: "admin" | "user"
}

/**
 * Configurações da conta.
 *
 * Antes esta rota era um texto de "página em desenvolvimento". Agora reúne o
 * que o usuário realmente procura aqui: quem ele é, como o tema se comporta e
 * onde ficam as notificações (que vivem no aplicativo).
 */
export function Settings({ userName, userRole }: SettingsProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-base font-semibold text-primary-foreground">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{userName || "Usuário"}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                {userRole === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {userRole === "admin" ? "Administrador" : "Usuário"}
              </Badge>
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-primary" />
            Aparência
          </CardTitle>
          <CardDescription>Escolha como o To Liso aparece neste navegador.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ThemeOption
              icon={<Sun className="h-4 w-4" />}
              label="Claro"
              isActive={theme === "light"}
              onSelect={() => theme !== "light" && toggleTheme()}
            />
            <ThemeOption
              icon={<Moon className="h-4 w-4" />}
              label="Escuro"
              isActive={theme === "dark"}
              onSelect={() => theme !== "dark" && toggleTheme()}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Notificações
          </CardTitle>
          <CardDescription>Avisos de despesas compartilhadas e lembretes de fatura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            As notificações são entregues pelo aplicativo Android do To Liso. Instale o aplicativo, entre com a mesma
            conta e ative os avisos na aba <span className="font-medium text-foreground">Ajustes</span>.
          </p>
          <div className="glass glass-soft glass-flat flex items-start gap-3 rounded-md p-3">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">O que você recebe</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>Quando alguém divide uma despesa com você</li>
                <li>Quando um administrador lança algo na sua conta</li>
                <li>3 dias e 1 dia antes de cada fatura fechar</li>
                <li>3 dias, 1 dia e no dia do vencimento</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ThemeOption({
  icon,
  label,
  isActive,
  onSelect,
}: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <Button
      variant="outline"
      onClick={onSelect}
      aria-pressed={isActive}
      className={`h-auto flex-1 justify-start gap-3 px-4 py-3 ${
        isActive ? "border-primary/60 text-primary" : ""
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {isActive ? <Check className="h-4 w-4" /> : null}
    </Button>
  )
}
