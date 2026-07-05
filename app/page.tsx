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
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

function SyncButton() {
  const { syncAll, isSyncing } = useSyncContext()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={syncAll}
      disabled={isSyncing}
      title="Sincronizar dados"
      className="h-8 w-8 p-0 hover:bg-custom-success-light dark:hover:bg-custom-success-dark text-custom-text-secondary dark:text-custom-text-secondary-dark hover:text-custom-primary dark:hover:text-custom-primary"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      <span className="sr-only">Sincronizar dados</span>
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
        const storedUserEmail = localStorage.getItem("userEmail") || ""
        const storedUserRole = localStorage.getItem("userRole") || "user"
        const isAdmin = storedUserEmail === "gabrielpaixao588@gmail.com" || storedUserRole === "admin"

        setIsAuthenticated(authStatus === "true")
        setUserName(storedUserName)
        setUserRole(isAdmin ? "admin" : "user")
        setIsLoading(false)
        return
      }

      // Qualquer outra resposta inesperada: tratar como não autenticado
      clearAuthState()
    }

    checkAuth()
  }, [])

  const handleLogin = (user: { id: string; email: string; name: string; role: "admin" | "user" }) => {
    // Removed console.log of user data
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
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-custom-text-primary dark:text-custom-text-primary-dark">
              Configurações
            </h1>
            <p className="text-custom-text-secondary dark:text-custom-text-secondary-dark mt-2">
              Página em desenvolvimento...
            </p>
          </div>
        )
      default:
        return <Home onLogout={handleLogout} userRole={userRole} />
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, userRole])

  const getPageTitle = () => {
    switch (currentPage) {
      case "home":
        return "Home"
      case "dashboard":
        return userRole === "admin" ? "Dashboard" : "Home"
      case "invoices":
        return userRole === "admin" ? "Faturas" : "Home"
      case "admin-users":
        return "Gerenciar Usuários"
      case "admin-cards":
        return "Gerenciar Cartões"
      case "settings":
        return "Configurações"
      default:
        return "Home"
    }
  }

  return (
    <ThemeProvider>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-custom-bg-dark">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-custom-primary"></div>
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
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b border-custom-border dark:border-custom-border-dark bg-white dark:bg-custom-bg-dark">
                <div className="flex items-center gap-2 px-4 flex-1">
                  <CustomSidebarTrigger />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <h1 className="text-lg font-semibold text-custom-text-primary dark:text-custom-text-primary-dark flex-1">
                    {getPageTitle()}
                  </h1>
                  <SyncButton />
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{currentPageElement}</div>
            </SidebarInset>
          </SidebarProvider>
        </SyncProvider>
      )}
    </ThemeProvider>
  )
}
