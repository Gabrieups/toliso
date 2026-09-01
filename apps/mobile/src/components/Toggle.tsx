import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import React from "react"
import { Pressable, StyleSheet, Switch, View } from "react-native"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

export interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
  icon?: keyof typeof Ionicons.glyphMap
  disabled?: boolean
}

/** Linha com interruptor — opções ligado/desligado dentro de formulários. */
export function ToggleRow({ label, description, value, onChange, icon, disabled }: ToggleRowProps) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={() => {
        if (disabled) return
        Haptics.selectionAsync().catch(() => undefined)
        onChange(!value)
      }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.row,
        { backgroundColor: theme.glass.fillSoft, borderColor: theme.glass.border, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: value ? theme.tint.positive : theme.tint.neutral }]}>
          <Ionicons name={icon} size={16} color={value ? theme.accent.primary : theme.text.muted} />
        </View>
      ) : null}

      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="micro" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={(next) => {
          if (!disabled) onChange(next)
        }}
        disabled={disabled}
        trackColor={{ false: theme.tint.neutral, true: `${theme.accent.primary}88` }}
        thumbColor={value ? theme.accent.primary : theme.text.muted}
      />
    </Pressable>
  )
}

export interface CheckRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** `radio` mostra um círculo; `check`, um quadrado. */
  shape?: "check" | "radio"
}

/** Item selecionável em listas de múltipla ou única escolha. */
export function CheckRow({ label, description, checked, onChange, shape = "check" }: CheckRowProps) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined)
        onChange(!checked)
      }}
      accessibilityRole={shape === "radio" ? "radio" : "checkbox"}
      accessibilityState={{ checked }}
      style={[
        styles.checkRow,
        {
          backgroundColor: checked ? theme.tint.positive : theme.glass.fillSoft,
          borderColor: checked ? theme.accent.primary : theme.glass.border,
        },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderRadius: shape === "radio" ? 11 : 7,
            borderColor: checked ? theme.accent.primary : theme.glass.borderStrong,
            backgroundColor: checked ? theme.accent.primary : "transparent",
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={14} color={theme.text.inverse} /> : null}
      </View>

      <View style={styles.text}>
        <Text variant="body" numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="micro" tone="muted" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  box: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
})
