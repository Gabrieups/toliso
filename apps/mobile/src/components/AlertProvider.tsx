import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import * as Haptics from "expo-haptics"
import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import { Modal, Pressable, StyleSheet, View } from "react-native"
import { Button } from "./Button"
import { Glass } from "./Glass"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { spacing } from "@/theme/tokens"
import { IS_EXPO_GO } from "@/utils/expoGo"

export type AlertVariant = "info" | "success" | "error" | "warning"

export interface AlertOptions {
  title?: string
  message: string
  variant?: AlertVariant
  confirmText?: string
  cancelText?: string
  /** Exibe o botão de cancelar, transformando o aviso em confirmação. */
  showCancel?: boolean
  /** Deixa o botão de confirmação vermelho — use em exclusões. */
  destructive?: boolean
  onConfirm?: () => void | Promise<void>
}

interface AlertContextValue {
  show: (options: AlertOptions) => void
  /** Atalho para confirmações de exclusão. */
  confirmDelete: (message: string, onConfirm: () => void | Promise<void>, title?: string) => void
}

const AlertContext = createContext<AlertContextValue | null>(null)

const DEFAULT_TITLES: Record<AlertVariant, string> = {
  info: "Informação",
  success: "Tudo certo",
  error: "Algo deu errado",
  warning: "Atenção",
}

const ICONS: Record<AlertVariant, keyof typeof Ionicons.glyphMap> = {
  info: "information-circle",
  success: "checkmark-circle",
  error: "alert-circle",
  warning: "warning",
}

/**
 * Diálogos de aviso e confirmação em uma única fila global — equivalente ao
 * `use-alert-modal` da web, para que as duas plataformas se comportem igual.
 */
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const [options, setOptions] = useState<AlertOptions | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const show = useCallback((next: AlertOptions) => {
    const variant = next.variant ?? "info"
    Haptics.notificationAsync(
      variant === "error"
        ? Haptics.NotificationFeedbackType.Error
        : variant === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => undefined)

    setOptions(next)
  }, [])

  const confirmDelete = useCallback(
    (message: string, onConfirm: () => void | Promise<void>, title = "Confirmar exclusão") => {
      show({
        title,
        message,
        variant: "warning",
        showCancel: true,
        destructive: true,
        confirmText: "Excluir",
        onConfirm,
      })
    },
    [show],
  )

  const close = useCallback(() => {
    setOptions(null)
    setIsBusy(false)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!options?.onConfirm) {
      close()
      return
    }

    try {
      setIsBusy(true)
      await options.onConfirm()
    } finally {
      close()
    }
  }, [options, close])

  const value = useMemo<AlertContextValue>(() => ({ show, confirmDelete }), [show, confirmDelete])

  const variant = options?.variant ?? "info"
  const accent =
    variant === "success"
      ? theme.accent.positive
      : variant === "error"
        ? theme.accent.danger
        : variant === "warning"
          ? theme.accent.warning
          : theme.accent.info

  return (
    <AlertContext.Provider value={value}>
      {children}

      <Modal visible={options !== null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={options?.showCancel ? close : undefined}>
            {IS_EXPO_GO ? null : (
              <BlurView
                intensity={theme.blur.modal}
                tint={theme.blurTint}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[StyleSheet.absoluteFill, styles.scrim]} />
          </Pressable>

          <Glass variant="strong" corner="xl" elevation="floating" style={styles.dialog} contentStyle={styles.content}>
            <View style={[styles.iconWrapper, { backgroundColor: `${accent}22` }]}>
              <Ionicons name={ICONS[variant]} size={26} color={accent} />
            </View>

            <Text variant="heading" style={styles.title}>
              {options?.title ?? DEFAULT_TITLES[variant]}
            </Text>

            <Text variant="body" tone="secondary" style={styles.message}>
              {options?.message}
            </Text>

            <View style={styles.actions}>
              {options?.showCancel ? (
                <Button
                  label={options.cancelText ?? "Cancelar"}
                  variant="glass"
                  onPress={close}
                  disabled={isBusy}
                  style={styles.action}
                />
              ) : null}
              <Button
                label={options?.confirmText ?? "OK"}
                variant={options?.destructive ? "danger" : "primary"}
                onPress={handleConfirm}
                loading={isBusy}
                style={styles.action}
              />
            </View>
          </Glass>
        </View>
      </Modal>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) throw new Error("useAlert deve ser usado dentro de AlertProvider")
  return context
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  scrim: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
  },
  content: {
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
  action: {
    flex: 1,
  },
})
