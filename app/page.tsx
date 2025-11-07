"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { Dashboard } from "@/components/dashboard"
import { AdminUsers } from "@/components/admin-users"
import { AdminCards } from "@/components/admin-cards"
import { Invoices } from "@/components/invoices"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger"
import { ThemeProvider } from "@/contexts/theme-context"
import { Separator } from "@/components/ui/separator"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [userRole, setUserRole] = useState<"admin" | "user">("user")
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          method: "GET",
          credentials: "include",
        })

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
      } catch (error) {
        // Removed console.log of error
      }

      const authStatus = localStorage.getItem("isAuthenticated")
      const storedUserName = localStorage.getItem("userName") || "Usuário"
      const storedUserEmail = localStorage.getItem("userEmail") || ""
      const storedUserRole = localStorage.getItem("userRole") || "user"

      const isAdmin = storedUserEmail === "gabrielpaixao588@gmail.com" || storedUserRole === "admin"

      setIsAuthenticated(authStatus === "true")
      setUserName(storedUserName)
      setUserRole(isAdmin ? "admin" : "user")
      setIsLoading(false)
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
    setCurrentPage("dashboard")
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onLogout={handleLogout} currentPage={currentPage} userRole={userRole} />
      case "invoices":
        // Only allow admin users to access invoices
        return userRole === "admin" ? (
          <Invoices />
        ) : (
          <Dashboard onLogout={handleLogout} currentPage="dashboard" userRole={userRole} />
        )
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
        return <Dashboard onLogout={handleLogout} currentPage="dashboard" userRole={userRole} />
    }
  }

  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard":
        return "Dashboard"
      case "invoices":
        return userRole === "admin" ? "Faturas" : "Dashboard"
      case "admin-users":
        return "Gerenciar Usuários"
      case "admin-cards":
        return "Gerenciar Cartões"
      case "settings":
        return "Configurações"
      default:
        return "Dashboard"
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
              <div className="flex items-center gap-2 px-4">
                <CustomSidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <h1 className="text-lg font-semibold text-custom-text-primary dark:text-custom-text-primary-dark">
                  {getPageTitle()}
                </h1>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{renderCurrentPage()}</div>
          </SidebarInset>
        </SidebarProvider>
      )}
    </ThemeProvider>
  )
}
