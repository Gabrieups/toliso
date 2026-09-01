import * as Haptics from "expo-haptics"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Contador opcional exibido ao lado do rótulo. */
  count?: number
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** Alternador de abas em vidro — substitui as `Tabs` da web. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme()

  return (
    <View style={[styles.track, { backgroundColor: theme.glass.fillSoft, borderColor: theme.glass.border }]}>
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (isActive) return
              Haptics.selectionAsync().catch(() => undefined)
              onChange(option.value)
            }}
            style={[
              styles.segment,
              isActive && {
                backgroundColor: theme.glass.fillStrong,
                borderColor: theme.glass.borderStrong,
                borderWidth: StyleSheet.hairlineWidth * 2,
              },
            ]}
          >
            <Text variant="caption" tone={isActive ? "primary" : "secondary"} numberOfLines={1}>
              {option.label}
              {option.count !== undefined ? ` (${option.count})` : ""}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "transparent",
  },
})
