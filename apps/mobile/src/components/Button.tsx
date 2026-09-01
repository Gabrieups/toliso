import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

type Variant = "primary" | "glass" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

export interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  icon?: keyof typeof Ionicons.glyphMap
  iconPosition?: "left" | "right"
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const HEIGHTS: Record<Size, number> = { sm: 38, md: 48, lg: 56 }

/** Botão do sistema de design. O primário usa gradiente da marca; os demais, vidro. */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const theme = useTheme()
  const isDisabled = disabled || loading

  const handlePress = () => {
    if (isDisabled) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined)
    onPress?.()
  }

  const labelTone = variant === "primary" || variant === "danger" ? "inverse" : "primary"
  const iconColor =
    variant === "primary" || variant === "danger"
      ? theme.text.inverse
      : variant === "ghost"
        ? theme.text.secondary
        : theme.text.primary

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <>
          {icon && iconPosition === "left" ? <Ionicons name={icon} size={18} color={iconColor} /> : null}
          <Text variant={size === "sm" ? "caption" : "bodyStrong"} tone={labelTone} style={styles.label}>
            {label}
          </Text>
          {icon && iconPosition === "right" ? <Ionicons name={icon} size={18} color={iconColor} /> : null}
        </>
      )}
    </View>
  )

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          paddingHorizontal: size === "sm" ? spacing.lg : spacing.xl,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        fullWidth && styles.fullWidth,
        variant === "glass" && {
          backgroundColor: theme.glass.fillStrong,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.glass.borderStrong,
        },
        variant === "ghost" && { backgroundColor: "transparent" },
        style,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[theme.accent.primary, theme.accent.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {variant === "danger" ? (
        <LinearGradient
          colors={[theme.accent.danger, "#B93A2C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    textAlign: "center",
  },
})
