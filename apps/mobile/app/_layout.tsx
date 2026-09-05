import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import React, { useEffect } from "react"
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AlertProvider } from "@/components/AlertProvider"
import { CoinsSplash } from "@/components/CoinsSplash"
import { ScreenBackground } from "@/components/Screen"
import { AuthProvider, useAuth } from "@/state/auth"
import { DataProvider } from "@/state/data"
import { NotificationsProvider } from "@/state/notifications"
import { ThemeProvider, useTheme, useThemeControls } from "@/theme/ThemeProvider"

SplashScreen.preventAutoHideAsync().catch(() => undefined)

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <NotificationsProvider>
                <AlertProvider>
                  <RootNavigator />
                </AlertProvider>
              </NotificationsProvider>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/**
 * A splash nativa (estática, obrigatória) esconde assim que o JS sobe — quem
 * assume a partir daí é a `CoinsSplash`, animada, até tema e sessão serem
 * lidos do disco. Isso evita que o usuário fique olhando pra uma imagem
 * parada enquanto o app inicializa, sem arriscar piscar a tela de login para
 * quem já está autenticado.
 */
function RootNavigator() {
  const theme = useTheme()
  const { isReady: isThemeReady } = useThemeControls()
  const { isRestoring } = useAuth()

  const isReady = isThemeReady && !isRestoring

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined)
  }, [])

  if (!isReady) {
    return <CoinsSplash />
  }

  return (
    <ScreenBackground>
      <StatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin/users" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="admin/cards" options={{ animation: "slide_from_right" }} />
      </Stack>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
