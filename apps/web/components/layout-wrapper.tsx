"use client"

import type React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

interface LayoutWrapperProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
  onLogout: () => void
  userRole: "admin" | "user"
  userName: string
}

export function LayoutWrapper({
  children,
  currentPage,
  onPageChange,
  onLogout,
  userRole,
  userName,
}: LayoutWrapperProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider>
        <AppSidebar
          currentPage={currentPage}
          onPageChange={onPageChange}
          onLogout={onLogout}
          userRole={userRole}
          userName={userName}
        />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">{children}</SidebarInset>
      </SidebarProvider>
    </div>
  )
}
