import { Ionicons } from "@expo/vector-icons"
import React, { useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Sheet } from "./Sheet"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

export interface SelectOption<T extends string> {
  value: T
  label: string
  description?: string
  /** Marcador colorido à esquerda, ex.: a cor do cartão. */
  color?: string
}

export interface SelectProps<T extends string> {
  label?: string
  placeholder?: string
  value: T | null
  options: SelectOption<T>[]
  onChange: (value: T) => void
  icon?: keyof typeof Ionicons.glyphMap
  disabled?: boolean
  error?: string
  /** Título da folha de seleção. Padrão: o próprio `label`. */
  sheetTitle?: string
}

/**
 * Seletor que abre uma folha com as opções.
 *
 * Um seletor nativo de roda é ruim para listas com descrição (cartões, usuários);
 * a folha mostra rótulo, descrição e cor de uma vez, com alvos de toque grandes.
 */
export function Select<T extends string>({
  label,
  placeholder = "Selecionar",
  value,
  options,
  onChange,
  icon,
  disabled = false,
  error,
  sheetTitle,
}: SelectProps<T>) {
  const theme = useTheme()
  const [isOpen, setOpen] = useState(false)

  const selected = options.find((option) => option.value === value) ?? null

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="caption" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? "Opção"}: ${selected?.label ?? placeholder}`}
        style={[
          styles.trigger,
          {
            backgroundColor: theme.glass.fillSoft,
            borderColor: error ? theme.accent.danger : theme.glass.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {selected?.color ? (
          <View style={[styles.swatch, { backgroundColor: selected.color }]} />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={theme.text.muted} />
        ) : null}

        <Text variant="body" tone={selected ? "primary" : "muted"} numberOfLines={1} style={styles.triggerLabel}>
          {selected?.label ?? placeholder}
        </Text>

        <Ionicons name="chevron-down" size={18} color={theme.text.muted} />
      </Pressable>

      {error ? (
        <Text variant="caption" tone="negative" style={styles.label}>
          {error}
        </Text>
      ) : null}

      <Sheet
        visible={isOpen}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label ?? "Selecionar"}
        scrollable={false}
      >
        <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
          <View style={styles.optionListContent}>
            {options.length === 0 ? (
              <Text variant="caption" tone="muted">
                Nenhuma opção disponível.
              </Text>
            ) : null}

            {options.map((option) => {
              const isSelected = option.value === value

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.option,
                    {
                      backgroundColor: isSelected ? theme.tint.positive : theme.glass.fillSoft,
                      borderColor: isSelected ? theme.accent.primary : theme.glass.border,
                    },
                  ]}
                >
                  {option.color ? <View style={[styles.swatch, { backgroundColor: option.color }]} /> : null}

                  <View style={styles.optionText}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text variant="micro" tone="muted" numberOfLines={1}>
                        {option.description}
                      </Text>
                    ) : null}
                  </View>

                  {isSelected ? <Ionicons name="checkmark-circle" size={20} color={theme.accent.primary} /> : null}
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </Sheet>
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
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  optionList: {
    maxHeight: 420,
  },
  optionListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
})
