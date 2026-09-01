import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import React, { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AlertProvider } from "@/components/AlertProvider"
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
 * Esconde a splash somente quando tema e sessão já foram lidos do disco —
 * assim o app nunca pisca a tela de login para quem já está autenticado.
 */
function RootNavigator() {
  const theme = useTheme()
  const { isReady: isThemeReady } = useThemeControls()
  const { isRestoring } = useAuth()

  const isReady = isThemeReady && !isRestoring

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync().catch(() => undefined)
  }, [isReady])

  if (!isReady) {
    return <View style={[styles.root, { backgroundColor: theme.backdrop[0] }]} />
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
