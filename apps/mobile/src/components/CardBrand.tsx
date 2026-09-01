import React from "react"
import { StyleSheet, View } from "react-native"
import { Text } from "./Text"
import { radius } from "@/theme/tokens"
import type { CardBrand as CardBrandType } from "@toliso/core"

const BRAND_LABEL: Record<CardBrandType, string> = {
  visa: "VISA",
  mastercard: "MC",
  elo: "ELO",
  "american-express": "AMEX",
}

const BRAND_COLOR: Record<CardBrandType, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  elo: "#000000",
  "american-express": "#006FCF",
}

/**
 * Marca da bandeira em formato compacto.
 *
 * Um selo tipográfico em vez de logos importados: mantém o APK leve, sobrevive
 * a qualquer tema e evita depender de assets de marcas registradas.
 */
export function CardBrandMark({ brand, size = "md" }: { brand: CardBrandType; size?: "sm" | "md" }) {
  const isSmall = size === "sm"

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: BRAND_COLOR[brand],
          paddingHorizontal: isSmall ? 5 : 7,
          paddingVertical: isSmall ? 2 : 3,
        },
      ]}
    >
      <Text style={[styles.label, { fontSize: isSmall ? 8 : 9 }]}>{BRAND_LABEL[brand] ?? "CARD"}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm - 6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
})
