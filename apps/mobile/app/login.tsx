import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { Redirect } from "expo-router"
import React, { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "@/api/client"
import { Button } from "@/components/Button"
import { Field } from "@/components/Field"
import { Glass } from "@/components/Glass"
import { Text } from "@/components/Text"
import { useAuth } from "@/state/auth"
import { useTheme, useThemeControls } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

/** Tela de acesso. Mesmas credenciais e regras da plataforma web. */
export default function LoginScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { login, isAuthenticated } = useAuth()
  const { toggle, preference } = useThemeControls()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha para continuar")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await login(email.trim(), password)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível entrar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={toggle}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Alternar tema"
            style={[styles.themeButton, { backgroundColor: theme.glass.fill, borderColor: theme.glass.border }]}
          >
            <Ionicons
              name={preference === "light" ? "sunny-outline" : "moon-outline"}
              size={18}
              color={theme.text.primary}
            />
          </Pressable>
        </View>

        <View style={styles.brand}>
          <LinearGradient
            colors={[theme.accent.primary, theme.accent.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Ionicons name="card" size={30} color="#FFFFFF" />
          </LinearGradient>

          <Text variant="display">To Liso</Text>
          <Text variant="body" tone="secondary" style={styles.tagline}>
            Controle de gastos no cartão, dividido com quem importa.
          </Text>
        </View>

        <Glass variant="strong" corner="xl" elevation="floating" contentStyle={styles.card}>
          <Text variant="heading">Entrar</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.tint.negative, borderColor: `${theme.accent.danger}55` }]}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.accent.danger} />
              <Text variant="caption" style={[styles.errorText, { color: theme.accent.danger }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Field
            label="E-mail"
            icon="mail-outline"
            placeholder="voce@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboard="email-address"
            editable={!isLoading}
            returnKeyType="next"
          />

          <Field
            label="Senha"
            icon="lock-closed-outline"
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secure
            autoCapitalize="none"
            autoComplete="password"
            editable={!isLoading}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          <Button label="Entrar" icon="arrow-forward" iconPosition="right" onPress={handleSubmit} loading={isLoading} fullWidth />

          <Text variant="micro" tone="muted" style={styles.footnote}>
            Não tem conta? Peça acesso ao administrador.
          </Text>
        </Glass>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  topBar: {
    alignItems: "flex-end",
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  brand: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  tagline: {
    textAlign: "center",
    maxWidth: 300,
  },
  card: {
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  errorText: {
    flex: 1,
  },
  footnote: {
    textAlign: "center",
  },
})
