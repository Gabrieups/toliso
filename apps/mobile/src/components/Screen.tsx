import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg"
import { useTheme } from "@/theme/ThemeProvider"

/**
 * Fundo de todas as telas: gradiente profundo + três manchas de cor.
 *
 * As manchas são desenhadas com um gradiente radial (via `react-native-svg`)
 * em vez de desfocadas com `BlurView` — no Android, o `BlurView` sem o modo
 * experimental não desfoca de verdade (só aplica um tom translúcido), e o modo
 * experimental derruba o app dentro do Expo Go. O gradiente radial garante uma
 * borda suave em qualquer plataforma, sem depender de blur nenhum.
 */
export function ScreenBackground({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme()

  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={theme.backdrop} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Orb id="orbTop" color={theme.orbs.primary} size={320} style={styles.orbTop} />
        <Orb id="orbRight" color={theme.orbs.secondary} size={280} style={styles.orbRight} />
        <Orb id="orbBottom" color={theme.orbs.tertiary} size={360} style={styles.orbBottom} />
      </View>

      {children}
    </View>
  )
}

function Orb({ id, color, size, style }: { id: string; color: string; size: number; style: ViewStyle }) {
  const radius = size / 2

  return (
    <Svg width={size} height={size} style={[styles.orb, style]}>
      <Defs>
        {/* `userSpaceOnUse` com valores em pixel evita um bug conhecido do
            react-native-svg no Android, onde `objectBoundingBox` + unidades em
            porcentagem faz o gradiente parar de desvanecer antes da borda e
            deixa o quadrado do `Rect` visível por trás. */}
        <RadialGradient id={id} cx={radius} cy={radius} r={radius} gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  orb: {
    position: "absolute",
  },
  orbTop: {
    top: -120,
    left: -80,
  },
  orbRight: {
    top: 180,
    right: -120,
  },
  orbBottom: {
    bottom: -160,
    left: -60,
  },
})
