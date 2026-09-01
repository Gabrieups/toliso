import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { Glass } from "./Glass"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { spacing } from "@/theme/tokens"

/** Indicador de carregamento centralizado, com mensagem opcional. */
export function Loading({ label = "Carregando..." }: { label?: string }) {
  const theme = useTheme()

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.accent.primary} />
      <Text variant="caption" tone="secondary" style={styles.loadingLabel}>
        {label}
      </Text>
    </View>
  )
}

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description?: string
  children?: React.ReactNode
}

/** Estado vazio: diz o que aconteceu e qual é o próximo passo. */
export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  const theme = useTheme()

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.tint.neutral }]}>
        <Ionicons name={icon} size={26} color={theme.text.muted} />
      </View>
      <Text variant="heading" style={styles.emptyTitle}>
        {title}
      </Text>
      {description ? (
        <Text variant="caption" tone="secondary" style={styles.emptyDescription}>
          {description}
        </Text>
      ) : null}
      {children ? <View style={styles.emptyActions}>{children}</View> : null}
    </View>
  )
}

export interface BannerProps {
  tone?: "info" | "warning" | "negative" | "positive"
  icon?: keyof typeof Ionicons.glyphMap
  message: string
}

/** Aviso contextual no topo de uma tela (ex.: nenhum cartão cadastrado). */
export function Banner({ tone = "info", icon = "information-circle-outline", message }: BannerProps) {
  const theme = useTheme()

  const color =
    tone === "warning"
      ? theme.accent.warning
      : tone === "negative"
        ? theme.accent.negative
        : tone === "positive"
          ? theme.accent.positive
          : theme.accent.info

  return (
    <Glass variant="soft" corner="md" elevation="flat" contentStyle={styles.banner}>
      <Ionicons name={icon} size={18} color={color} />
      <Text variant="caption" tone="secondary" style={styles.bannerText}>
        {message}
      </Text>
    </Glass>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  loadingLabel: {
    marginTop: spacing.xs,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyDescription: {
    textAlign: "center",
    maxWidth: 280,
  },
  emptyActions: {
    marginTop: spacing.md,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerText: {
    flex: 1,
  },
})
