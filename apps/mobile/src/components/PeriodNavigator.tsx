import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import React, { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Glass } from "./Glass"
import { Sheet } from "./Sheet"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"
import { MONTH_NAMES_SHORT, getCurrentPeriod, getYearFromPeriod } from "@toliso/core"

export interface PeriodNavigatorProps {
  selected: string
  periods: string[]
  display: string
  onSelect: (period: string) => void
  onOlder: () => void
  onNewer: () => void
  hasOlder: boolean
  hasNewer: boolean
}

/**
 * Barra de período: setas para meses vizinhos e um toque no centro abre a
 * grade de meses. Os meses sem movimentação ficam visíveis porém apagados —
 * o usuário enxerga o histórico inteiro em vez de adivinhar o que existe.
 */
export function PeriodNavigator({
  selected,
  periods,
  display,
  onSelect,
  onOlder,
  onNewer,
  hasOlder,
  hasNewer,
}: PeriodNavigatorProps) {
  const theme = useTheme()
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(() => getYearFromPeriod(selected))

  const years = Array.from(new Set([...periods.map(getYearFromPeriod), getYearFromPeriod(getCurrentPeriod())])).sort()
  const minYear = years[0] ?? displayYear
  const maxYear = years[years.length - 1] ?? displayYear

  const openPicker = () => {
    setDisplayYear(getYearFromPeriod(selected))
    setPickerOpen(true)
  }

  const handleMonthPress = (monthIndex: number) => {
    const period = `${displayYear}-${(monthIndex + 1).toString().padStart(2, "0")}`
    Haptics.selectionAsync().catch(() => undefined)
    onSelect(period)
    setPickerOpen(false)
  }

  return (
    <>
      <Glass corner="pill" variant="soft" elevation="flat" contentStyle={styles.bar}>
        <ArrowButton icon="chevron-back" onPress={onOlder} disabled={!hasOlder} label="Período anterior" />

        <Pressable onPress={openPicker} style={styles.center} accessibilityRole="button" accessibilityLabel={`Período ${display}. Toque para escolher outro`}>
          <Ionicons name="calendar-outline" size={16} color={theme.accent.primary} />
          <Text variant="caption" numberOfLines={1} style={styles.label}>
            {display}
          </Text>
        </Pressable>

        <ArrowButton icon="chevron-forward" onPress={onNewer} disabled={!hasNewer} label="Próximo período" />
      </Glass>

      <Sheet
        visible={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Escolher período"
        subtitle="Ciclos de fatura do dia 16 ao dia 15"
        scrollable={false}
      >
        <View style={styles.yearRow}>
          <ArrowButton
            icon="chevron-back"
            onPress={() => setDisplayYear((year) => year - 1)}
            disabled={displayYear <= minYear}
            label="Ano anterior"
          />
          <Text variant="title">{displayYear}</Text>
          <ArrowButton
            icon="chevron-forward"
            onPress={() => setDisplayYear((year) => year + 1)}
            disabled={displayYear >= maxYear}
            label="Próximo ano"
          />
        </View>

        <View style={styles.monthGrid}>
          {MONTH_NAMES_SHORT.map((month, monthIndex) => {
            const period = `${displayYear}-${(monthIndex + 1).toString().padStart(2, "0")}`
            const isSelected = period === selected
            const hasData = periods.includes(period)
            const isCurrent = period === getCurrentPeriod()

            return (
              <Pressable
                key={month}
                onPress={() => handleMonthPress(monthIndex)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.month,
                  {
                    backgroundColor: isSelected ? theme.accent.primary : theme.glass.fillSoft,
                    borderColor: isCurrent && !isSelected ? theme.accent.primary : theme.glass.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  tone={isSelected ? "inverse" : hasData ? "primary" : "muted"}
                >
                  {month}
                </Text>
                {hasData && !isSelected ? (
                  <View style={[styles.dot, { backgroundColor: theme.accent.primary }]} />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </Sheet>
    </>
  )
}

function ArrowButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean
  label: string
}) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={() => {
        if (disabled) return
        Haptics.selectionAsync().catch(() => undefined)
        onPress()
      }}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.arrow, { backgroundColor: theme.glass.fillSoft, opacity: disabled ? 0.3 : 1 }]}
    >
      <Ionicons name={icon} size={18} color={theme.text.primary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  center: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    flexShrink: 1,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  month: {
    width: "22%",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
