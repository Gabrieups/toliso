import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import { useTheme } from "@/theme/ThemeProvider"

/**
 * Fundo de todas as telas: gradiente profundo + três manchas de cor desfocadas.
 *
 * As manchas são o que faz as superfícies de vidro parecerem realmente vidro —
 * sem algo colorido por trás, o desfoque não tem o que refratar.
 */
export function ScreenBackground({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme()

  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={theme.backdrop} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.orb, styles.orbTop, { backgroundColor: theme.orbs.primary }]} />
        <View style={[styles.orb, styles.orbRight, { backgroundColor: theme.orbs.secondary }]} />
        <View style={[styles.orb, styles.orbBottom, { backgroundColor: theme.orbs.tertiary }]} />
      </View>

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    // O blur de fundo real vem do BlurView das superfícies; aqui um raio
    // generoso + opacidade baixa já entrega a mancha difusa.
    opacity: 0.9,
  },
  orbTop: {
    width: 320,
    height: 320,
    top: -120,
    left: -80,
  },
  orbRight: {
    width: 280,
    height: 280,
    top: 180,
    right: -120,
  },
  orbBottom: {
    width: 360,
    height: 360,
    bottom: -160,
    left: -60,
  },
})
