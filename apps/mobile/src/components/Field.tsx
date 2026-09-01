import { Ionicons } from "@expo/vector-icons"
import React, { useState } from "react"
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing, typography } from "@/theme/tokens"

export interface FieldProps extends Omit<TextInputProps, "style"> {
  label?: string
  hint?: string
  error?: string
  icon?: keyof typeof Ionicons.glyphMap
  /** Prefixo fixo à esquerda, ex.: `R$`. */
  prefix?: string
  secure?: boolean
  keyboard?: KeyboardTypeOptions
  containerStyle?: StyleProp<ViewStyle>
  multiline?: boolean
}

/** Campo de texto sobre vidro, com foco destacado pela cor da marca. */
export function Field({
  label,
  hint,
  error,
  icon,
  prefix,
  secure = false,
  keyboard,
  containerStyle,
  multiline = false,
  ...rest
}: FieldProps) {
  const theme = useTheme()
  const [isFocused, setIsFocused] = useState(false)
  const [isHidden, setIsHidden] = useState(secure)

  const borderColor = error ? theme.accent.danger : isFocused ? theme.accent.primary : theme.glass.border

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text variant="caption" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.glass.fillSoft,
            borderColor,
            borderWidth: isFocused || error ? 1.5 : StyleSheet.hairlineWidth * 2,
            minHeight: multiline ? 96 : 52,
            alignItems: multiline ? "flex-start" : "center",
            paddingVertical: multiline ? spacing.md : 0,
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={isFocused ? theme.accent.primary : theme.text.muted} /> : null}
        {prefix ? (
          <Text variant="bodyStrong" tone="secondary">
            {prefix}
          </Text>
        ) : null}

        <TextInput
          style={[
            styles.input,
            typography.body,
            { color: theme.text.primary, textAlignVertical: multiline ? "top" : "center" },
          ]}
          placeholderTextColor={theme.text.muted}
          secureTextEntry={isHidden}
          keyboardType={keyboard}
          multiline={multiline}
          onFocus={(event) => {
            setIsFocused(true)
            rest.onFocus?.(event)
          }}
          onBlur={(event) => {
            setIsFocused(false)
            rest.onBlur?.(event)
          }}
          {...rest}
        />

        {secure ? (
          <Pressable
            onPress={() => setIsHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={isHidden ? "Mostrar senha" : "Ocultar senha"}
          >
            <Ionicons name={isHidden ? "eye-outline" : "eye-off-outline"} size={20} color={theme.text.muted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" tone="negative" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    marginLeft: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  helper: {
    marginLeft: spacing.xs,
  },
})
