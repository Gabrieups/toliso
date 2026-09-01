import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { LinearGradient } from "expo-linear-gradient"
import React, { useEffect, useRef, useState } from "react"
import { Animated, Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Glass } from "./Glass"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

export interface FabAction {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean
}

/**
 * Botão de ação flutuante que abre um leque de opções.
 *
 * Fica acima da barra de abas e ao alcance do polegar — na web esta ação é um
 * menu suspenso no topo, o que no celular exigiria esticar a mão até lá.
 */
export function ActionFab({ actions }: { actions: FabAction[] }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [isOpen, setOpen] = useState(false)
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start()
  }, [isOpen, progress])

  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] })

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined)
    setOpen((value) => !value)
  }

  return (
    <>
      {isOpen ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
          accessibilityLabel="Fechar menu de ações"
        />
      ) : null}

      <View style={[styles.container, { bottom: insets.bottom + 88 }]} pointerEvents="box-none">
        {isOpen ? (
          <Animated.View
            style={[
              styles.actions,
              {
                opacity: progress,
                transform: [
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                ],
              },
            ]}
          >
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  if (action.disabled) return
                  setOpen(false)
                  action.onPress()
                }}
                disabled={action.disabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: action.disabled }}
                style={{ opacity: action.disabled ? 0.45 : 1 }}
              >
                <Glass variant="strong" corner="pill" elevation="floating" contentStyle={styles.action}>
                  <Ionicons name={action.icon} size={18} color={theme.accent.primary} />
                  <Text variant="caption">{action.label}</Text>
                </Glass>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={isOpen ? "Fechar ações" : "Adicionar lançamento"}
          accessibilityState={{ expanded: isOpen }}
          style={({ pressed }) => [styles.fab, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
        >
          <LinearGradient
            colors={[theme.accent.primary, theme.accent.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: spacing.xl,
    alignItems: "flex-end",
    gap: spacing.md,
  },
  actions: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
})
