import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import React from "react"
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { KeyboardAvoidingView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Glass } from "./Glass"
import { Text } from "./Text"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"

export interface SheetProps {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  /** Rodapé fixo — normalmente os botões de ação. */
  footer?: React.ReactNode
  /** Altura máxima como fração da tela. Padrão: 0.9. */
  maxHeightRatio?: number
  scrollable?: boolean
}

/**
 * Painel deslizante de vidro, usado no lugar dos `Dialog` da web.
 *
 * Em telas de celular, uma folha ancorada na parte de baixo mantém os campos e
 * os botões ao alcance do polegar — bem melhor que um diálogo centralizado.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.9,
  scrollable = true,
}: SheetProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const body = scrollable ? (
    <ScrollView
      style={{ maxHeight: `${maxHeightRatio * 100 - 22}%` }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.scrollContent}>{children}</View>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar">
          <BlurView intensity={theme.blur.modal} tint={theme.blurTint} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardWrapper}
          pointerEvents="box-none"
        >
          <Glass
            variant="strong"
            corner="xl"
            elevation="floating"
            intensity={theme.blur.modal}
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            <View style={[styles.grabber, { backgroundColor: theme.glass.borderStrong }]} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text variant="heading">{title}</Text>
                {subtitle ? (
                  <Text variant="caption" tone="secondary">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                style={[styles.closeButton, { backgroundColor: theme.tint.neutral }]}
              >
                <Ionicons name="close" size={18} color={theme.text.secondary} />
              </Pressable>
            </View>

            {body}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Glass>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  keyboardWrapper: {
    justifyContent: "flex-end",
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: spacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
})
