import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import React, { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Button } from "./Button"
import { Sheet } from "./Sheet"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"
import {
  MONTH_NAMES_LONG,
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatISODate,
  fromISODate,
  todayISODate,
} from "@toliso/core"

export interface DatePickerProps {
  /** Data no formato `YYYY-MM-DD`, ou string vazia quando não há data. */
  value: string
  onChange: (value: string) => void
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  /** Permite voltar ao estado "sem data". */
  clearable?: boolean
}

/**
 * Seletor de data do aplicativo.
 *
 * Substitui o campo de texto em que o usuário precisava digitar `AAAA-MM-DD` na
 * mão. O gatilho tem a mesma aparência do `Select`, e o calendário abre numa
 * folha de vidro — mesmo formato `dd/mm/aaaa` e mesmos atalhos ("Hoje",
 * "Limpar") do seletor da plataforma web.
 */
export function DatePicker({
  value,
  onChange,
  label,
  hint,
  error,
  placeholder = "Escolher data",
  disabled = false,
  clearable = false,
}: DatePickerProps) {
  const theme = useTheme()
  const [isOpen, setOpen] = useState(false)

  const selectedDate = fromISODate(value)
  const [cursor, setCursor] = useState(() => {
    const base = selectedDate ?? new Date()
    return { year: base.getFullYear(), month: base.getMonth() }
  })

  const open = () => {
    if (disabled) return
    // Sempre abre no mês da data escolhida — reabrir no mês atual obrigaria o
    // usuário a navegar de volta toda vez.
    const base = fromISODate(value) ?? new Date()
    setCursor({ year: base.getFullYear(), month: base.getMonth() })
    setOpen(true)
  }

  const shiftMonth = (offset: number) => {
    Haptics.selectionAsync().catch(() => undefined)
    setCursor((current) => {
      const next = new Date(current.year, current.month + offset, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  const select = (iso: string) => {
    Haptics.selectionAsync().catch(() => undefined)
    onChange(iso)
    setOpen(false)
  }

  const cells = buildMonthGrid(cursor.year, cursor.month)
  const today = todayISODate()
  const label_ = formatISODate(value)

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="caption" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={open}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label_ ? `${label ?? "Data"}: ${label_}. Toque para alterar` : placeholder}
        style={[
          styles.trigger,
          {
            backgroundColor: theme.glass.fillSoft,
            borderColor: error ? theme.accent.danger : theme.glass.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={18} color={theme.text.muted} />

        <Text variant="body" tone={label_ ? "primary" : "muted"} numberOfLines={1} style={styles.triggerLabel}>
          {label_ || placeholder}
        </Text>

        {clearable && label_ && !disabled ? (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Limpar data"
          >
            <Ionicons name="close-circle" size={18} color={theme.text.muted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={theme.text.muted} />
        )}
      </Pressable>

      {error ? (
        <Text variant="caption" tone="negative" style={styles.label}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted" style={styles.label}>
          {hint}
        </Text>
      ) : null}

      <Sheet
        visible={isOpen}
        onClose={() => setOpen(false)}
        title={label ?? "Escolher data"}
        scrollable={false}
        footer={
          <>
            <Button label="Hoje" variant="glass" onPress={() => select(today)} style={styles.flex} />
            {clearable ? (
              <Button
                label="Limpar"
                variant="ghost"
                onPress={() => {
                  onChange("")
                  setOpen(false)
                }}
                style={styles.flex}
              />
            ) : null}
          </>
        }
      >
        <View style={styles.monthHeader}>
          <NavButton icon="chevron-back" onPress={() => shiftMonth(-1)} label="Mês anterior" />
          <Text variant="heading">
            {MONTH_NAMES_LONG[cursor.month]} {cursor.year}
          </Text>
          <NavButton icon="chevron-forward" onPress={() => shiftMonth(1)} label="Próximo mês" />
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((weekday, index) => (
            <Text key={`${weekday}-${index}`} variant="micro" tone="muted" style={styles.weekday}>
              {weekday}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, index) => {
            if (!cell.iso) {
              return <View key={`blank-${index}`} style={styles.cell} />
            }

            const isSelected = cell.iso === value
            const isToday = cell.iso === today

            return (
              <Pressable
                key={cell.iso}
                onPress={() => select(cell.iso!)}
                accessibilityRole="button"
                accessibilityLabel={formatISODate(cell.iso)}
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.cell,
                  styles.day,
                  isSelected && { backgroundColor: theme.accent.primary },
                  !isSelected && isToday && { borderWidth: 1, borderColor: theme.accent.primary },
                ]}
              >
                <Text variant="caption" tone={isSelected ? "inverse" : isToday ? "accent" : "primary"}>
                  {cell.day}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Sheet>
    </View>
  )
}

function NavButton({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  label: string
}) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.navButton, { backgroundColor: theme.glass.fillSoft }]}
    >
      <Ionicons name={icon} size={18} color={theme.text.primary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  label: {
    marginLeft: spacing.xs,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  triggerLabel: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    borderRadius: radius.pill,
  },
})
