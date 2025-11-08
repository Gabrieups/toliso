"use client"

import type * as React from "react"
import { Home, Settings, Users, Wallet, LogOut, User, Shield, Receipt } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarClickOutside } from "@/components/sidebar-click-outside"
import { CreditCard } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPage: string
  onPageChange: (page: string) => void
  onLogout: () => void
  userRole: "admin" | "user"
  userName: string
}

export function AppSidebar({ currentPage, onPageChange, onLogout, userRole, userName, ...props }: AppSidebarProps) {
  const userMenuItems = [
    {
      title: "Home",
      url: "home",
      icon: Home,
    },
  ]

  const adminMenuItems = [
    {
      title: "Home",
      url: "home",
      icon: Home,
    },
    {
      title: "Dashboard",
      url: "dashboard",
      icon: Receipt,
    },
    {
      title: "Faturas",
      url: "invoices",
      icon: Receipt,
    },
    {
      title: "Gerenciar Usuários",
      url: "admin-users",
      icon: Users,
    },
    {
      title: "Gerenciar Cartões",
      url: "admin-cards",
      icon: Wallet,
    },
    {
      title: "Configurações",
      url: "settings",
      icon: Settings,
    },
  ]

  const menuItems = userRole === "admin" ? adminMenuItems : userMenuItems

  return (
    <SidebarClickOutside>
      <Sidebar variant="inset" collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-custom-primary text-white">
              <CreditCard className="h-2 w-2 text-white" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-custom-text-primary dark:text-custom-text-primary-dark">
                To Liso
              </span>
              <span className="truncate text-xs text-custom-text-secondary dark:text-custom-text-secondary-dark">
                Gestão Financeira
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-custom-text-secondary dark:text-custom-text-secondary-dark">
              Menu Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPage === item.url}
                      className="hover:bg-custom-success-light dark:hover:bg-custom-success-dark"
                    >
                      <button onClick={() => onPageChange(item.url)} className="flex items-center gap-2 w-full">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-custom-primary text-white">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-custom-text-primary dark:text-custom-text-primary-dark">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-custom-text-secondary dark:text-custom-text-secondary-dark flex items-center gap-1">
                    {userRole === "admin" ? (
                      <>
                        <Shield className="h-3 w-3" />
                        Administrador
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        Usuário
                      </>
                    )}
                  </span>
                </div>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <ThemeToggle />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start text-custom-error dark:text-custom-error-dark hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </SidebarClickOutside>
  )
}
