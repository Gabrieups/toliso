import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect, useRef } from "react"
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { spacing } from "@/theme/tokens"
import { getInitials } from "@toliso/core"

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Mostra o botão de voltar em vez do avatar. */
  showBack?: boolean
  /** Nome exibido no avatar à direita. */
  userName?: string
  onSync?: () => void
  isSyncing?: boolean
}

/** Cabeçalho comum às telas: identidade à esquerda, ações à direita. */
export function PageHeader({ title, subtitle, showBack, userName, onSync, isSyncing }: PageHeaderProps) {
  const theme = useTheme()
  const router = useRouter()

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={[styles.circle, { backgroundColor: theme.glass.fill, borderColor: theme.glass.border }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text.primary} />
        </Pressable>
      ) : null}

      <View style={styles.titleBlock}>
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {onSync ? <SyncButton onPress={onSync} isSyncing={isSyncing} /> : null}

        {userName && !showBack ? (
          <View style={[styles.avatar, { backgroundColor: theme.accent.primary }]}>
            <Text variant="caption" tone="inverse">
              {getInitials(userName)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

/** Botão de sincronizar com o ícone girando enquanto a requisição roda. */
function SyncButton({ onPress, isSyncing }: { onPress: () => void; isSyncing?: boolean }) {
  const theme = useTheme()
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!isSyncing) {
      spin.stopAnimation()
      spin.setValue(0)
      return
    }

    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )

    animation.start()
    return () => animation.stop()
  }, [isSyncing, spin])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })

  return (
    <Pressable
      onPress={onPress}
      disabled={isSyncing}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Sincronizar dados"
      accessibilityState={{ busy: isSyncing }}
      style={[styles.circle, { backgroundColor: theme.glass.fill, borderColor: theme.glass.border }]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="sync-outline" size={18} color={isSyncing ? theme.accent.primary : theme.text.secondary} />
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
})
