"use client"

import type * as React from "react"
import { CreditCard, Home, LayoutDashboard, LogOut, Receipt, Settings, Shield, User, Users, Wallet } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarClickOutside } from "@/components/sidebar-click-outside"

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
import { getInitials } from "@toliso/core"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentPage: string
  onPageChange: (page: string) => void
  onLogout: () => void
  userRole: "admin" | "user"
  userName: string
}

interface MenuSection {
  label: string
  items: Array<{ title: string; url: string; icon: React.ComponentType<{ className?: string }> }>
}

export function AppSidebar({ currentPage, onPageChange, onLogout, userRole, userName, ...props }: AppSidebarProps) {
  // O menu é agrupado por intenção: o dia a dia primeiro, administração depois.
  // Antes tudo vinha numa lista só, o que fazia "Gerenciar cartões" competir
  // visualmente com "Home".
  const sections: MenuSection[] =
    userRole === "admin"
      ? [
          {
            label: "Meu dia a dia",
            items: [{ title: "Início", url: "home", icon: Home }],
          },
          {
            label: "Visão geral",
            items: [
              { title: "Painel", url: "dashboard", icon: LayoutDashboard },
              { title: "Faturas", url: "invoices", icon: Receipt },
            ],
          },
          {
            label: "Administração",
            items: [
              { title: "Usuários", url: "admin-users", icon: Users },
              { title: "Cartões", url: "admin-cards", icon: Wallet },
              { title: "Configurações", url: "settings", icon: Settings },
            ],
          },
        ]
      : [
          {
            label: "Meu dia a dia",
            items: [{ title: "Início", url: "home", icon: Home }],
          },
        ]

  return (
    <SidebarClickOutside>
      <Sidebar collapsible="offcanvas" className="border-none bg-transparent" {...props}>
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-glass">
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">To Liso</span>
              <span className="truncate text-xs text-muted-foreground">Gestão financeira</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {sections.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const isActive = currentPage === item.url

                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="rounded-lg data-[active=true]:bg-primary/12 data-[active=true]:font-semibold data-[active=true]:text-primary"
                        >
                          <button
                            onClick={() => onPageChange(item.url)}
                            aria-current={isActive ? "page" : undefined}
                            className="flex w-full items-center gap-3"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="glass glass-soft glass-flat mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-xs font-semibold text-primary-foreground">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">{userName}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
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
                className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </SidebarClickOutside>
  )
}
