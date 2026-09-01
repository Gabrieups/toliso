import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

type Tone = "neutral" | "positive" | "negative" | "info" | "warning" | "custom"

export interface ChipProps {
  label: string
  tone?: Tone
  icon?: keyof typeof Ionicons.glyphMap
  /** Cor sólida usada quando `tone` é `custom` (ex.: a cor do cartão). */
  color?: string
  onPress?: () => void
  onRemove?: () => void
  selected?: boolean
  style?: StyleProp<ViewStyle>
}

/** Etiqueta compacta: cartão, parcelas, usuário, status. */
export function Chip({ label, tone = "neutral", icon, color, onPress, onRemove, selected, style }: ChipProps) {
  const theme = useTheme()

  const background =
    tone === "custom" && color
      ? `${color}26`
      : tone === "positive"
        ? theme.tint.positive
        : tone === "negative"
          ? theme.tint.negative
          : tone === "info"
            ? theme.tint.info
            : tone === "warning"
              ? theme.tint.warning
              : theme.tint.neutral

  const foreground =
    tone === "custom" && color
      ? color
      : tone === "positive"
        ? theme.accent.positive
        : tone === "negative"
          ? theme.accent.negative
          : tone === "info"
            ? theme.accent.info
            : tone === "warning"
              ? theme.accent.warning
              : theme.text.secondary

  const Container = onPress ? Pressable : View

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={[
        styles.chip,
        {
          backgroundColor: background,
          borderColor: selected ? foreground : "transparent",
          borderWidth: selected ? 1 : 0,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={foreground} /> : null}
      <Text variant="micro" style={{ color: foreground }} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remover ${label}`}>
          <Ionicons name="close" size={12} color={foreground} />
        </Pressable>
      ) : null}
    </Container>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
})
