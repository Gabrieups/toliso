"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"

export function ThemeToggleCompact() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="bg-white/80 dark:bg-custom-bg-dark/80 border-custom-border dark:border-custom-border-dark hover:bg-white/70 dark:hover:bg-custom-bg-dark"
    >
      {theme === "light" ? (
        <>
          <Moon className="h-4 w-4 mr-2" />
          <span>Escuro</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 mr-2" />
          <span>Claro</span>
        </>
      )}
    </Button>
  )
}
