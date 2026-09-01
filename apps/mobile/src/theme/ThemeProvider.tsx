import AsyncStorage from "@react-native-async-storage/async-storage"
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useColorScheme } from "react-native"
import { themes, type ThemeTokens } from "./tokens"

export type ThemePreference = "light" | "dark" | "system"

const STORAGE_KEY = "@toliso/theme"

interface ThemeContextValue {
  theme: ThemeTokens
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  toggle: () => void
  isReady: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>("system")
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored)
        }
      })
      .finally(() => setIsReady(true))
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined)
  }, [])

  const resolved: "light" | "dark" =
    preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark")
  }, [resolved, setPreference])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[resolved], preference, setPreference, toggle, isReady }),
    [resolved, preference, setPreference, toggle, isReady],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeTokens {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  return context.theme
}

export function useThemeControls() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useThemeControls deve ser usado dentro de ThemeProvider")
  return context
}
