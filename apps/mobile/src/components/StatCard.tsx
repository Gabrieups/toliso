import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Glass } from "./Glass"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { spacing } from "@/theme/tokens"
import { formatCurrency } from "@toliso/core"

export interface StatCardProps {
  label: string
  value: number
  caption?: string
  icon: keyof typeof Ionicons.glyphMap
  tone?: "positive" | "negative" | "neutral"
  /** Prefixo do valor, ex.: `+` para pagamentos. */
  sign?: "+" | "-" | ""
  style?: StyleProp<ViewStyle>
}

/** Bloco de destaque numérico: gastos, pagamentos, saldo. */
export function StatCard({ label, value, caption, icon, tone = "neutral", sign = "", style }: StatCardProps) {
  const theme = useTheme()

  const color =
    tone === "positive" ? theme.accent.positive : tone === "negative" ? theme.accent.negative : theme.text.primary
  const tint =
    tone === "positive" ? theme.tint.positive : tone === "negative" ? theme.tint.negative : theme.tint.neutral

  return (
    <Glass style={style} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="micro" tone="secondary" numberOfLines={1} style={styles.label}>
          {label.toUpperCase()}
        </Text>
        <View style={[styles.iconWrapper, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
      </View>

      <Text variant="amount" tabular style={{ color }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {sign}
        {formatCurrency(value)}
      </Text>

      {caption ? (
        <Text variant="micro" tone="muted" numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Glass>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    flex: 1,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
})
