"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start text-custom-text-primary dark:text-custom-text-primary-dark"
    >
      {theme === "light" ? (
        <>
          <Moon className="h-4 w-4 mr-2" />
          <span>Modo Escuro</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 mr-2" />
          <span>Modo Claro</span>
        </>
      )}
    </Button>
  )
}
