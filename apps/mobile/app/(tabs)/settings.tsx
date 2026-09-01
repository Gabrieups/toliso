import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError, getBaseUrl, resetBaseUrl, setBaseUrl } from "@/api/client"
import { pushApi } from "@/api/endpoints"
import { useAlert } from "@/components/AlertProvider"
import { Button } from "@/components/Button"
import { Chip } from "@/components/Chip"
import { Field } from "@/components/Field"
import { Glass } from "@/components/Glass"
import { PageHeader } from "@/components/PageHeader"
import { Segmented } from "@/components/Segmented"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { ToggleRow } from "@/components/Toggle"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { useNotifications } from "@/state/notifications"
import { useTheme, useThemeControls } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"
import { formatDateTime, getInitials } from "@toliso/core"
import { sendLocalTestNotification } from "@/utils/notifications"

/** Ajustes: conta, aparência, notificações, administração e servidor. */
export default function SettingsScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const alert = useAlert()
  const { user, isAdmin, logout } = useAuth()
  const { syncedAt, refresh, isSyncing } = useData()
  const { preference, setPreference } = useThemeControls()
  const notifications = useNotifications()

  const [isServerOpen, setServerOpen] = useState(false)
  const [serverUrl, setServerUrl] = useState("")
  const [isTesting, setTesting] = useState(false)

  useEffect(() => {
    setServerUrl(getBaseUrl())
  }, [isServerOpen])

  const handleTestNotification = async () => {
    setTesting(true)
    try {
      // Primeiro o aviso local (funciona sempre), depois o push pelo servidor.
      await sendLocalTestNotification()
      const result = await pushApi.test()

      alert.show({
        variant: "success",
        message:
          result.delivered > 0
            ? "Enviamos um aviso local e um push pelo servidor. Os dois devem chegar em instantes."
            : "O aviso local foi enviado. O push pelo servidor ainda não está disponível para este aparelho.",
      })
    } catch (caught) {
      alert.show({
        variant: "warning",
        message:
          caught instanceof ApiError
            ? `Aviso local enviado. O push pelo servidor falhou: ${caught.message}`
            : "Aviso local enviado, mas o push pelo servidor falhou.",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveServer = async () => {
    const trimmed = serverUrl.trim()

    if (!/^https?:\/\/.+/i.test(trimmed)) {
      alert.show({ variant: "error", message: "Informe uma URL começando com http:// ou https://" })
      return
    }

    await setBaseUrl(trimmed)
    setServerOpen(false)
    alert.show({
      variant: "success",
      message: "Servidor atualizado. Entre novamente para aplicar a mudança.",
      onConfirm: logout,
    })
  }

  const handleLogout = () => {
    alert.show({
      variant: "warning",
      title: "Sair da conta",
      message: "Você precisará entrar novamente para acessar seus lançamentos.",
      showCancel: true,
      confirmText: "Sair",
      destructive: true,
      onConfirm: logout,
    })
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Ajustes" subtitle="Conta e preferências" />

        <Glass variant="strong" contentStyle={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: theme.accent.primary }]}>
            <Text variant="title" tone="inverse">
              {getInitials(user?.name)}
            </Text>
          </View>

          <View style={styles.profileText}>
            <Text variant="heading" numberOfLines={1}>
              {user?.name}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {user?.email}
            </Text>
            <Chip
              label={isAdmin ? "Administrador" : "Usuário"}
              tone={isAdmin ? "positive" : "neutral"}
              icon={isAdmin ? "shield-checkmark-outline" : "person-outline"}
            />
          </View>
        </Glass>

        <Section title="Aparência">
          <Text variant="caption" tone="secondary">
            Tema do aplicativo
          </Text>
          <Segmented
            value={preference}
            onChange={setPreference}
            options={[
              { value: "light", label: "Claro" },
              { value: "dark", label: "Escuro" },
              { value: "system", label: "Sistema" },
            ]}
          />
        </Section>

        <Section title="Notificações">
          <ToggleRow
            label="Avisos ativos"
            description="Despesas divididas, pagamentos e lembretes de fatura"
            icon="notifications-outline"
            value={notifications.enabled}
            onChange={notifications.setEnabled}
          />

          {notifications.enabled ? (
            <>
              <View style={styles.statusRow}>
                <Chip
                  label={
                    notifications.permission === "granted"
                      ? "Permissão concedida"
                      : notifications.permission === "denied"
                        ? "Permissão negada"
                        : "Permissão pendente"
                  }
                  tone={notifications.permission === "granted" ? "positive" : "warning"}
                  icon="shield-outline"
                />
                <Chip
                  label={`${notifications.scheduledCount} lembrete${notifications.scheduledCount === 1 ? "" : "s"} agendado${notifications.scheduledCount === 1 ? "" : "s"}`}
                  tone="info"
                  icon="alarm-outline"
                />
                <Chip
                  label={notifications.pushToken ? "Push conectado" : "Push indisponível"}
                  tone={notifications.pushToken ? "positive" : "neutral"}
                  icon="cloud-outline"
                />
              </View>

              <Text variant="micro" tone="muted">
                Lembretes são disparados 3 dias e 1 dia antes do fechamento, e 3 dias, 1 dia e no dia do vencimento de
                cada fatura em aberto.
              </Text>

              <View style={styles.buttonRow}>
                <Button
                  label="Enviar teste"
                  variant="glass"
                  icon="paper-plane-outline"
                  onPress={handleTestNotification}
                  loading={isTesting}
                  style={styles.flex}
                />
                {notifications.permission !== "granted" ? (
                  <Button
                    label="Permitir"
                    icon="lock-open-outline"
                    onPress={notifications.reconnect}
                    style={styles.flex}
                  />
                ) : null}
              </View>
            </>
          ) : null}
        </Section>

        {isAdmin ? (
          <Section title="Administração">
            <NavRow
              icon="people-outline"
              label="Gerenciar usuários"
              description="Criar, editar e desativar contas"
              onPress={() => router.push("/admin/users")}
            />
            <NavRow
              icon="card-outline"
              label="Gerenciar cartões"
              description="Bandeiras, cores, fechamento e vencimento"
              onPress={() => router.push("/admin/cards")}
            />
          </Section>
        ) : null}

        <Section title="Dados">
          <NavRow
            icon="sync-outline"
            label="Sincronizar agora"
            description={syncedAt ? `Última sincronização: ${formatDateTime(syncedAt)}` : "Nunca sincronizado"}
            onPress={() => refresh()}
            busy={isSyncing}
          />
          <NavRow
            icon="server-outline"
            label="Servidor"
            description={getBaseUrl()}
            onPress={() => setServerOpen(true)}
          />
        </Section>

        <Button label="Sair da conta" variant="glass" icon="log-out-outline" onPress={handleLogout} fullWidth />

        <Text variant="micro" tone="muted" style={styles.version}>
          To Liso · versão 1.0.0
        </Text>
      </ScrollView>

      <Sheet
        visible={isServerOpen}
        onClose={() => setServerOpen(false)}
        title="Endereço do servidor"
        subtitle="Aponte o aplicativo para a sua instalação da plataforma web"
        scrollable={false}
        footer={
          <>
            <Button
              label="Padrão"
              variant="glass"
              onPress={async () => {
                const restored = await resetBaseUrl()
                setServerUrl(restored)
              }}
              style={styles.flex}
            />
            <Button label="Salvar" onPress={handleSaveServer} style={styles.flex} />
          </>
        }
      >
        <Field
          label="URL"
          icon="globe-outline"
          placeholder="https://toliso.exemplo.com.br"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          keyboard="url"
          hint="Sem barra no final. Ao salvar, será necessário entrar novamente."
        />
      </Sheet>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="micro" tone="muted">
        {title.toUpperCase()}
      </Text>
      <Glass contentStyle={styles.sectionContent}>{children}</Glass>
    </View>
  )
}

function NavRow({
  icon,
  label,
  description,
  onPress,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  description?: string
  onPress: () => void
  busy?: boolean
}) {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.navRow,
        { backgroundColor: theme.glass.fillSoft, borderColor: theme.glass.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.navIcon, { backgroundColor: theme.tint.neutral }]}>
        <Ionicons name={icon} size={18} color={theme.accent.primary} />
      </View>

      <View style={styles.navText}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="micro" tone="muted" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.text.muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    flex: 1,
    gap: 2,
  },
  version: {
    textAlign: "center",
    marginTop: spacing.sm,
  },
})
