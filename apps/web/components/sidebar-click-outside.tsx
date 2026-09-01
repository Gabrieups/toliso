"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { useSidebar } from "@/components/ui/sidebar"

interface SidebarClickOutsideProps {
  children: React.ReactNode
}

export function SidebarClickOutside({ children }: SidebarClickOutsideProps) {
  const { open, setOpen, isMobile } = useSidebar()
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Só fechar se a sidebar estiver aberta
      if (!open) return

      // No mobile, o comportamento já é nativo (overlay)
      if (isMobile) return

      // Verificar se o clique foi fora da sidebar
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Verificar se não clicou no botão de toggle (para evitar conflito)
        const target = event.target as HTMLElement
        const isToggleButton = target.closest('[data-sidebar="trigger"]')

        if (!isToggleButton) {
          setOpen(false)
        }
      }
    }

    // Adicionar listener apenas quando a sidebar estiver aberta
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, setOpen, isMobile])

  return (
    <div ref={sidebarRef} className="h-full">
      {children}
    </div>
  )
}
