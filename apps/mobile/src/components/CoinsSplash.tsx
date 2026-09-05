import React, { useEffect, useMemo, useRef } from "react"
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from "react-native"

/**
 * Tela mostrada entre o fim da splash nativa (estática, obrigatória) e o app
 * ficar pronto (`isReady` em `_layout.tsx`) — moedinhas caindo em loop sobre o
 * mesmo fundo da splash, pra não haver corte seco entre as duas.
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")
const COIN_COUNT = 12
const BACKDROP = "#0B1220"

interface CoinConfig {
  left: number
  size: number
  duration: number
  delay: number
}

function useCoinConfigs(): CoinConfig[] {
  return useMemo(
    () =>
      Array.from({ length: COIN_COUNT }, () => ({
        left: Math.random() * (SCREEN_WIDTH - 28),
        size: 16 + Math.random() * 14,
        duration: 2600 + Math.random() * 1800,
        delay: Math.random() * 2200,
      })),
    [],
  )
}

function Coin({ config }: { config: CoinConfig }) {
  const translateY = useRef(new Animated.Value(-40)).current
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT + 40,
            duration: config.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(spin, {
            toValue: 1,
            duration: config.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [config, translateY, spin])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })

  return (
    <Animated.View
      style={[
        styles.coin,
        {
          left: config.left,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    >
      <Text style={[styles.coinText, { fontSize: config.size * 0.5 }]}>$</Text>
    </Animated.View>
  )
}

export function CoinsSplash() {
  const coins = useCoinConfigs()

  return (
    <View style={styles.root}>
      {coins.map((config, index) => (
        <Coin key={index} config={config} />
      ))}
      <Image source={require("../../assets/logo-mark.png")} style={styles.logo} resizeMode="contain" />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKDROP,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coin: {
    position: "absolute",
    top: 0,
    backgroundColor: "#F1C40F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C79A06",
  },
  coinText: {
    color: "#8A6D00",
    fontWeight: "700",
  },
  logo: {
    width: 96,
    height: 96,
  },
})
