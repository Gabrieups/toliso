import React from "react"
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { typography } from "@/theme/tokens"

type Variant = keyof typeof typography
type Tone = "primary" | "secondary" | "muted" | "inverse" | "positive" | "negative" | "accent" | "warning"

export interface TextProps extends RNTextProps {
  variant?: Variant
  tone?: Tone
  /** Números tabulares — mantém os valores alinhados ao atualizar. */
  tabular?: boolean
}

/** Texto com a escala tipográfica e as cores do tema já aplicadas. */
export function Text({ variant = "body", tone = "primary", tabular, style, ...rest }: TextProps) {
  const theme = useTheme()

  const colorByTone: Record<Tone, string> = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    muted: theme.text.muted,
    inverse: theme.text.inverse,
    positive: theme.accent.positive,
    negative: theme.accent.negative,
    accent: theme.accent.primary,
    warning: theme.accent.warning,
  }

  const tabularStyle: TextStyle | undefined = tabular ? { fontVariant: ["tabular-nums"] } : undefined

  return <RNText style={[typography[variant], { color: colorByTone[tone] }, tabularStyle, style]} {...rest} />
}
