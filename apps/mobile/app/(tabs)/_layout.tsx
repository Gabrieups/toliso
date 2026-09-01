import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { Redirect, Tabs } from "expo-router"
import React from "react"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAuth } from "@/state/auth"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

/**
 * Barra de abas flutuante em vidro.
 *
 * As abas de administração só existem para quem é admin — exatamente como o
 * menu lateral da web decide o que mostrar.
 */
export default function TabsLayout() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { isAuthenticated, isAdmin } = useAuth()

  if (!isAuthenticated) {
    return <Redirect href="/login" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarActiveTintColor: theme.accent.primary,
        tabBarInactiveTintColor: theme.text.muted,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: [
          styles.bar,
          {
            bottom: insets.bottom + spacing.sm,
            borderColor: theme.glass.borderStrong,
            backgroundColor: theme.surface[1],
          },
        ],
        tabBarBackground: () => (
          <View style={styles.barBackground}>
            <LinearGradient colors={theme.surface} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="invoices"
        options={{
          title: "Faturas",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Painel",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    height: 64,
    paddingBottom: 0,
    paddingTop: 0,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  barBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  item: {
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
})
