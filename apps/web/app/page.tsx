"use client"

import { useState, useEffect, useMemo } from "react"
import { LoginForm } from "@/components/login-form"
import { Dashboard } from "@/components/dashboard"
import { Home } from "@/components/home"
import { AdminUsers } from "@/components/admin-users"
import { AdminCards } from "@/components/admin-cards"
import { Invoices } from "@/components/invoices"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger"
import { ThemeProvider } from "@/contexts/theme-context"
import { SyncProvider, useSyncContext } from "@/contexts/sync-context"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Settings } from "@/components/settings"

function SyncButton() {
  const { syncAll, isSyncing } = useSyncContext()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={syncAll}
      disabled={isSyncing}
      title="Sincronizar dados"
      aria-label="Sincronizar dados"
      aria-busy={isSyncing}
      className="h-9 w-9 text-muted-foreground hover:text-primary"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
    </Button>
  )
}

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState("home")
  const [userRole, setUserRole] = useState<"admin" | "user">("user")
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const clearAuthState = () => {
      localStorage.removeItem("isAuthenticated")
      localStorage.removeItem("userEmail")
      localStorage.removeItem("userName")
      localStorage.removeItem("userRole")
      setIsAuthenticated(false)
      setUserName("")
      setUserRole("user")
      setIsLoading(false)
    }

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        })

        // O servidor respondeu com sucesso e há uma sessão válida
        if (response.ok) {
          const userData = await response.json()
          if (userData.user) {
            setIsAuthenticated(true)
            setUserName(userData.user.name)
            setUserRole(userData.user.role)

            localStorage.setItem("isAuthenticated", "true")
            localStorage.setItem("userEmail", userData.user.email)
            localStorage.setItem("userName", userData.user.name)
            localStorage.setItem("userRole", userData.user.role)

            setIsLoading(false)
            return
          }
        }

        // O servidor respondeu de forma definitiva que NÃO há sessão válida
        // (ex.: 401 por sessão expirada). Não confiar no localStorage obsoleto,
        // pois isso deixaria a UI "logada" enquanto as Server Actions falham,
        // resultando em valores zerados. Forçar novo login.
        if (response.status === 401 || response.status === 403) {
          clearAuthState()
          return
        }
      } catch (error) {
        // Apenas em caso de erro de rede real (servidor inacessível) usamos
        // o localStorage como fallback otimista para não deslogar sem necessidade.
        const authStatus = localStorage.getItem("isAuthenticated")
        const storedUserName = localStorage.getItem("userName") || "Usuário"
        const storedUserRole = localStorage.getItem("userRole") || "user"

        setIsAuthenticated(authStatus === "true")
        setUserName(storedUserName)
        setUserRole(storedUserRole === "admin" ? "admin" : "user")
        setIsLoading(false)
        return
      }

      // Qualquer outra resposta inesperada: tratar como não autenticado
      clearAuthState()
    }

    checkAuth()
  }, [])

  const handleLogin = (user: { id: string; email: string; name: string; role: "admin" | "user" }) => {
    setIsAuthenticated(true)
    setUserName(user.name)
    setUserRole(user.role)

    localStorage.setItem("isAuthenticated", "true")
    localStorage.setItem("userEmail", user.email)
    localStorage.setItem("userName", user.name)
    localStorage.setItem("userRole", user.role)
  }

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userName")
    localStorage.removeItem("userRole")
    setIsAuthenticated(false)
    setCurrentPage("home")
  }

  // Memoizado para evitar remontagem dos componentes (e desregistro dos callbacks de sync)
  // quando o SyncContext atualiza isSyncing
  const currentPageElement = useMemo(() => {
    switch (currentPage) {
      case "home":
        return <Home onLogout={handleLogout} userRole={userRole} />
      case "dashboard":
        return userRole === "admin" ? (
          <Dashboard onLogout={handleLogout} currentPage={currentPage} userRole={userRole} />
        ) : (
          <Home onLogout={handleLogout} userRole={userRole} />
        )
      case "invoices":
        return userRole === "admin" ? <Invoices /> : <Home onLogout={handleLogout} userRole={userRole} />
      case "admin-users":
        return <AdminUsers />
      case "admin-cards":
        return <AdminCards />
      case "settings":
        return <Settings userName={userName} userRole={userRole} />
      default:
        return <Home onLogout={handleLogout} userRole={userRole} />
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, userRole, userName])

  const pageMeta = useMemo(() => {
    switch (currentPage) {
      case "dashboard":
        return userRole === "admin"
          ? { title: "Painel", subtitle: "Visão de todos os usuários" }
          : { title: "Início", subtitle: "Suas movimentações do período" }
      case "invoices":
        return userRole === "admin"
          ? { title: "Faturas", subtitle: "Ciclo do dia 16 ao dia 15" }
          : { title: "Início", subtitle: "Suas movimentações do período" }
      case "admin-users":
        return { title: "Usuários", subtitle: "Acesso e situação das contas" }
      case "admin-cards":
        return { title: "Cartões", subtitle: "Bandeiras, fechamento e vencimento" }
      case "settings":
        return { title: "Configurações", subtitle: "Preferências e aplicativo" }
      default:
        return { title: "Início", subtitle: "Suas movimentações do período" }
    }
  }, [currentPage, userRole])

  return (
    <ThemeProvider>
      {isLoading ? (
        <div className="flex min-h-dvh items-center justify-center">
          <div
            role="status"
            aria-label="Carregando"
            className="h-12 w-12 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
          />
        </div>
      ) : !isAuthenticated ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <SyncProvider>
          <SidebarProvider defaultOpen={false}>
            <AppSidebar
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onLogout={handleLogout}
              userRole={userRole}
              userName={userName}
            />
            <SidebarInset>
              {/*
                Cabeçalho fixo em vidro: o conteúdo desliza por baixo dele, o que
                mantém o título e o botão de sincronizar sempre acessíveis.
              */}
              <header className="glass glass-strong sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 [will-change:transform]">
                <CustomSidebarTrigger />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold leading-tight">{pageMeta.title}</h1>
                  <p className="truncate text-xs text-muted-foreground">{pageMeta.subtitle}</p>
                </div>
                <SyncButton />
              </header>

              <div className="mx-auto w-full max-w-6xl flex-1 px-3 pb-16 pt-4 sm:px-6">{currentPageElement}</div>
            </SidebarInset>
          </SidebarProvider>
        </SyncProvider>
      )}
    </ThemeProvider>
  )
}
