import { Ionicons } from "@expo/vector-icons"
import { Redirect } from "expo-router"
import React, { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "@/api/client"
import { reportsApi, usersApi, type AdminUser } from "@/api/endpoints"
import { useAlert } from "@/components/AlertProvider"
import { Button } from "@/components/Button"
import { Chip } from "@/components/Chip"
import { EmptyState, Loading } from "@/components/Feedback"
import { Field } from "@/components/Field"
import { Glass } from "@/components/Glass"
import { PageHeader } from "@/components/PageHeader"
import { Segmented } from "@/components/Segmented"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"
import {
  formatCurrency,
  getCurrentPeriod,
  getInitials,
  getPeriodDisplay,
  isInPeriod,
  sumAmount,
} from "@toliso/core"

interface FormState {
  name: string
  email: string
  password: string
  role: "admin" | "user"
  status: "active" | "inactive"
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: "user", status: "active" }

/**
 * Gerenciamento de usuários.
 *
 * Além do CRUD, cada linha mostra o quanto a pessoa gastou e pagou no período
 * corrente — é a informação que o administrador realmente procura ao abrir esta
 * tela, e evita ter que cruzar com o painel.
 */
export default function AdminUsersScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const alert = useAlert()
  const { isAdmin, user: currentUser } = useAuth()
  const { transactions, entries, refresh } = useData()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [isFormOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [sendingReportId, setSendingReportId] = useState<string | null>(null)

  const period = getCurrentPeriod()

  const load = async () => {
    try {
      const result = await usersApi.list()
      setUsers(result.users)
    } catch (caught) {
      alert.show({
        variant: "error",
        message: caught instanceof ApiError ? caught.message : "Não foi possível carregar os usuários",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Totais do período corrente por usuário — calculados a partir dos mesmos
  // lançamentos já sincronizados, sem ida extra ao servidor.
  const totals = useMemo(() => {
    const map = new Map<string, { expenses: number; payments: number }>()

    for (const transaction of transactions) {
      if (!isInPeriod(transaction.date, period)) continue
      const current = map.get(transaction.userId) ?? { expenses: 0, payments: 0 }
      current.expenses += Number(transaction.amount)
      map.set(transaction.userId, current)
    }

    for (const entry of entries) {
      if (!isInPeriod(entry.date, period)) continue
      const current = map.get(entry.userId) ?? { expenses: 0, payments: 0 }
      current.payments += Number(entry.amount)
      map.set(entry.userId, current)
    }

    return map
  }, [transactions, entries, period])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter(
      (item) => item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term),
    )
  }, [users, search])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setFormOpen(true)
  }

  const openEdit = (target: AdminUser) => {
    setEditing(target)
    setForm({ name: target.name, email: target.email, password: "", role: target.role, status: target.status })
    setError(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return setError("Informe o nome")
    if (!form.email.trim()) return setError("Informe o e-mail")
    if (!editing && !form.password) return setError("Informe uma senha inicial")

    setSaving(true)
    setError(null)

    try {
      if (editing) {
        await usersApi.update(editing.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
        })
      } else {
        await usersApi.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          status: form.status,
        })
      }

      setFormOpen(false)
      await load()
      await refresh({ silent: true })
      alert.show({ variant: "success", message: editing ? "Usuário atualizado." : "Usuário criado." })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  const handleSendReport = (target: AdminUser) => {
    alert.show({
      variant: "warning",
      title: "Enviar relatório",
      message: `Deseja enviar o relatório de gastos de ${getPeriodDisplay(period)} para ${target.name}?`,
      showCancel: true,
      confirmText: "Enviar",
      onConfirm: async () => {
        setSendingReportId(target.id)
        try {
          const result = await reportsApi.send({ userId: target.id, period })
          alert.show({ variant: "success", message: result.message })
        } catch (caught) {
          alert.show({
            variant: "error",
            message: caught instanceof ApiError ? caught.message : "Erro ao enviar relatório",
          })
        } finally {
          setSendingReportId(null)
        }
      },
    })
  }

  const handleDelete = (target: AdminUser) => {
    alert.confirmDelete(
      `Excluir ${target.name}? Os lançamentos já registrados permanecem no histórico.`,
      async () => {
        try {
          await usersApi.remove(target.id)
          await load()
        } catch (caught) {
          alert.show({
            variant: "error",
            message: caught instanceof ApiError ? caught.message : "Não foi possível excluir",
          })
        }
      },
    )
  }

  if (!isAdmin) {
    return <Redirect href="/(tabs)/home" />
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={load} tintColor={theme.accent.primary} />
        }
      >
        <PageHeader title="Usuários" subtitle={`${users.length} cadastrados`} showBack />

        <Field
          icon="search-outline"
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        <Button label="Novo usuário" icon="person-add-outline" onPress={openCreate} fullWidth />

        {isLoading ? (
          <Loading label="Carregando usuários..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Nenhum usuário encontrado"
            description={search ? "Tente outro termo de busca." : "Cadastre o primeiro usuário."}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => {
              const summary = totals.get(item.id)
              const balance = (summary?.expenses ?? 0) - (summary?.payments ?? 0)

              return (
                <Glass key={item.id} variant="soft" corner="md" elevation="flat" contentStyle={styles.row}>
                  <View style={styles.rowHeader}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: item.status === "active" ? theme.accent.primary : theme.tint.neutral },
                      ]}
                    >
                      <Text variant="caption" tone={item.status === "active" ? "inverse" : "muted"}>
                        {getInitials(item.name)}
                      </Text>
                    </View>

                    <View style={styles.rowText}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="micro" tone="muted" numberOfLines={1}>
                        {item.email}
                      </Text>
                    </View>

                    <View style={styles.rowActions}>
                      <IconButton
                        icon="paper-plane-outline"
                        color={theme.accent.primary}
                        onPress={() => handleSendReport(item)}
                        label={`Enviar relatório para ${item.name}`}
                        busy={sendingReportId === item.id}
                      />
                      <IconButton icon="pencil-outline" color={theme.accent.info} onPress={() => openEdit(item)} label={`Editar ${item.name}`} />
                      {item.id !== currentUser?.id ? (
                        <IconButton
                          icon="trash-outline"
                          color={theme.accent.danger}
                          onPress={() => handleDelete(item)}
                          label={`Excluir ${item.name}`}
                        />
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.chipRow}>
                    <Chip
                      label={item.role === "admin" ? "Administrador" : "Usuário"}
                      tone={item.role === "admin" ? "info" : "neutral"}
                      icon={item.role === "admin" ? "shield-checkmark-outline" : "person-outline"}
                    />
                    <Chip
                      label={item.status === "active" ? "Ativo" : "Inativo"}
                      tone={item.status === "active" ? "positive" : "negative"}
                    />
                  </View>

                  <View style={[styles.summary, { borderTopColor: theme.glass.border }]}>
                    <SummaryCell label="Gastos" value={summary?.expenses ?? 0} color={theme.accent.negative} />
                    <SummaryCell label="Pagos" value={summary?.payments ?? 0} color={theme.accent.positive} />
                    <SummaryCell
                      label="Saldo"
                      value={Math.abs(balance)}
                      color={balance > 0 ? theme.accent.negative : theme.accent.positive}
                    />
                  </View>
                </Glass>
              )
            })}
          </View>
        )}
      </ScrollView>

      <Sheet
        visible={isFormOpen}
        onClose={() => !isSaving && setFormOpen(false)}
        title={editing ? "Editar usuário" : "Novo usuário"}
        subtitle={editing ? editing.email : "Defina o acesso à plataforma"}
        footer={
          <>
            <Button
              label="Cancelar"
              variant="glass"
              onPress={() => setFormOpen(false)}
              disabled={isSaving}
              style={styles.flex}
            />
            <Button label="Salvar" onPress={handleSave} loading={isSaving} style={styles.flex} />
          </>
        }
      >
        {error ? (
          <Text variant="caption" tone="negative">
            {error}
          </Text>
        ) : null}

        <Field label="Nome" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />

        <Field
          label="E-mail"
          value={form.email}
          onChangeText={(email) => setForm({ ...form, email })}
          autoCapitalize="none"
          keyboard="email-address"
        />

        {!editing ? (
          <Field
            label="Senha inicial"
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
            secure
            autoCapitalize="none"
          />
        ) : null}

        <View style={styles.formField}>
          <Text variant="caption" tone="secondary">
            Perfil
          </Text>
          <Segmented
            value={form.role}
            onChange={(role) => setForm({ ...form, role })}
            options={[
              { value: "user", label: "Usuário" },
              { value: "admin", label: "Administrador" },
            ]}
          />
        </View>

        <View style={styles.formField}>
          <Text variant="caption" tone="secondary">
            Situação
          </Text>
          <Segmented
            value={form.status}
            onChange={(status) => setForm({ ...form, status })}
            options={[
              { value: "active", label: "Ativo" },
              { value: "inactive", label: "Inativo" },
            ]}
          />
        </View>
      </Sheet>
    </>
  )
}

function SummaryCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text variant="micro" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="caption" tabular style={{ color }} numberOfLines={1}>
        {formatCurrency(value)}
      </Text>
    </View>
  )
}

function IconButton({
  icon,
  color,
  onPress,
  label,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  onPress: () => void
  label: string
  busy?: boolean
}) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy }}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: `${color}1F`, opacity: pressed ? 0.6 : 1 }]}
    >
      {busy ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={16} color={color} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summary: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: spacing.md,
  },
  summaryCell: {
    flex: 1,
    gap: 2,
  },
  formField: {
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
})
