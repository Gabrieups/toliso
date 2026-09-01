import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"
import { radius } from "@/theme/tokens"

type Elevation = "flat" | "raised" | "floating"
type Variant = "default" | "strong" | "soft"

export interface GlassProps {
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  /** Raio de canto. Padrão: `lg` (24). */
  corner?: keyof typeof radius
  variant?: Variant
  elevation?: Elevation
  /** Intensidade do desfoque. Padrão: o valor de `card` do tema. */
  intensity?: number
  /** Filete colorido no topo — usado para identificar o cartão da fatura. */
  accentColor?: string
}

/**
 * Superfície de vidro: desfoque do que está atrás + preenchimento translúcido +
 * borda-fio + um brilho no topo que simula a luz batendo na quina do painel.
 *
 * No Android o `BlurView` é mais caro; por isso o preenchimento sozinho já
 * garante contraste suficiente caso o desfoque seja degradado pelo sistema.
 */
export function Glass({
  children,
  style,
  contentStyle,
  corner = "lg",
  variant = "default",
  elevation = "raised",
  intensity,
  accentColor,
}: GlassProps) {
  const theme = useTheme()

  const fill =
    variant === "strong" ? theme.glass.fillStrong : variant === "soft" ? theme.glass.fillSoft : theme.glass.fill
  const borderColor = variant === "strong" ? theme.glass.borderStrong : theme.glass.border

  return (
    <View
      style={[
        styles.container,
        { borderRadius: radius[corner], borderColor, backgroundColor: fill },
        elevationStyle(elevation, theme.glass.shadow),
        style,
      ]}
    >
      <BlurView
        intensity={intensity ?? theme.blur.card}
        tint={theme.blurTint}
        style={[StyleSheet.absoluteFill, { borderRadius: radius[corner] }]}
      />

      {/* Brilho superior: só o topo da superfície reflete a luz. */}
      <LinearGradient
        pointerEvents="none"
        colors={[theme.glass.highlight, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.sheen, { borderTopLeftRadius: radius[corner], borderTopRightRadius: radius[corner] }]}
      />

      {accentColor ? (
        <View
          pointerEvents="none"
          style={[
            styles.accent,
            {
              backgroundColor: accentColor,
              borderTopLeftRadius: radius[corner],
              borderTopRightRadius: radius[corner],
            },
          ]}
        />
      ) : null}

      <View style={contentStyle}>{children}</View>
    </View>
  )
}

function elevationStyle(elevation: Elevation, shadowColor: string): ViewStyle {
  if (elevation === "flat") return {}

  const floating = elevation === "floating"

  return Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOpacity: floating ? 0.26 : 0.16,
      shadowRadius: floating ? 28 : 18,
      shadowOffset: { width: 0, height: floating ? 14 : 8 },
    },
    android: {
      elevation: floating ? 12 : 5,
      shadowColor,
    },
    default: {},
  }) as ViewStyle
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.9,
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
})
