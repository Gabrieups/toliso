import { Ionicons } from "@expo/vector-icons"
import { Redirect } from "expo-router"
import React, { useEffect, useMemo, useState } from "react"
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "@/api/client"
import { cardsApi } from "@/api/endpoints"
import { useAlert } from "@/components/AlertProvider"
import { Button } from "@/components/Button"
import { CardBrandMark } from "@/components/CardBrand"
import { Chip } from "@/components/Chip"
import { EmptyState, Loading } from "@/components/Feedback"
import { Field } from "@/components/Field"
import { Glass } from "@/components/Glass"
import { PageHeader } from "@/components/PageHeader"
import { Segmented } from "@/components/Segmented"
import { Select } from "@/components/Select"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { useTheme } from "@/theme/ThemeProvider"
import { CARD_COLORS, radius, spacing } from "@/theme/tokens"
import { type CardBrand, type CreditCard } from "@toliso/core"

interface FormState {
  name: string
  bank: string
  type: CardBrand
  color: string
  status: "active" | "inactive"
  dueDate: string
  closingDate: string
}

const EMPTY_FORM: FormState = {
  name: "",
  bank: "",
  type: "visa",
  color: CARD_COLORS[0],
  status: "active",
  dueDate: "10",
  closingDate: "16",
}

const BRANDS: Array<{ value: CardBrand; label: string }> = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "american-express", label: "American Express" },
]

const DAYS = Array.from({ length: 28 }, (_, index) => String(index + 1))

/** Gerenciamento de cartões: bandeira, cor, fechamento e vencimento. */
export default function AdminCardsScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const alert = useAlert()
  const { isAdmin } = useAuth()
  const { refresh } = useData()

  const [cards, setCards] = useState<CreditCard[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const [isFormOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const result = await cardsApi.list()
      setCards(result.cards)
    } catch (caught) {
      alert.show({
        variant: "error",
        message: caught instanceof ApiError ? caught.message : "Não foi possível carregar os cartões",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return cards
    return cards.filter(
      (card) => card.name.toLowerCase().includes(term) || card.bank.toLowerCase().includes(term),
    )
  }, [cards, search])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setFormOpen(true)
  }

  const openEdit = (card: CreditCard) => {
    setEditing(card)
    setForm({
      name: card.name,
      bank: card.bank,
      type: card.type,
      color: card.color,
      status: card.status,
      dueDate: String(card.dueDate),
      closingDate: String(card.closingDate),
    })
    setError(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return setError("Informe o nome do cartão")
    if (!form.bank.trim()) return setError("Informe o banco emissor")

    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      bank: form.bank.trim(),
      type: form.type,
      color: form.color,
      status: form.status,
      dueDate: Number(form.dueDate),
      closingDate: Number(form.closingDate),
    }

    try {
      if (editing) {
        await cardsApi.update(editing.id, payload)
      } else {
        await cardsApi.create(payload)
      }

      setFormOpen(false)
      await load()
      await refresh({ silent: true })
      alert.show({ variant: "success", message: editing ? "Cartão atualizado." : "Cartão criado." })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível salvar")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (card: CreditCard) => {
    alert.confirmDelete(
      `Excluir o cartão ${card.name}? As despesas já lançadas continuam no histórico.`,
      async () => {
        try {
          await cardsApi.remove(card.id)
          await load()
          await refresh({ silent: true })
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
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.accent.primary} />}
      >
        <PageHeader title="Cartões" subtitle={`${cards.length} cadastrados`} showBack />

        <Field
          icon="search-outline"
          placeholder="Buscar por nome ou banco"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        <Button label="Novo cartão" icon="add-circle-outline" onPress={openCreate} fullWidth />

        {isLoading ? (
          <Loading label="Carregando cartões..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title="Nenhum cartão encontrado"
            description={search ? "Tente outro termo de busca." : "Cadastre o primeiro cartão de crédito."}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((card) => (
              <Glass
                key={card.id}
                variant="soft"
                corner="md"
                elevation="flat"
                accentColor={card.color}
                contentStyle={styles.row}
              >
                <View style={styles.rowHeader}>
                  <View style={[styles.brandBox, { backgroundColor: `${card.color}22` }]}>
                    <CardBrandMark brand={card.type} />
                  </View>

                  <View style={styles.rowText}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {card.name}
                    </Text>
                    <Text variant="micro" tone="muted" numberOfLines={1}>
                      {card.bank}
                    </Text>
                  </View>

                  <View style={styles.rowActions}>
                    <IconButton
                      icon="pencil-outline"
                      color={theme.accent.info}
                      onPress={() => openEdit(card)}
                      label={`Editar ${card.name}`}
                    />
                    <IconButton
                      icon="trash-outline"
                      color={theme.accent.danger}
                      onPress={() => handleDelete(card)}
                      label={`Excluir ${card.name}`}
                    />
                  </View>
                </View>

                <View style={styles.chipRow}>
                  <Chip
                    label={card.status === "active" ? "Ativo" : "Inativo"}
                    tone={card.status === "active" ? "positive" : "negative"}
                  />
                  <Chip label={`Fecha dia ${card.closingDate}`} tone="neutral" icon="lock-closed-outline" />
                  <Chip label={`Vence dia ${card.dueDate}`} tone="info" icon="calendar-outline" />
                </View>
              </Glass>
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet
        visible={isFormOpen}
        onClose={() => !isSaving && setFormOpen(false)}
        title={editing ? "Editar cartão" : "Novo cartão"}
        subtitle="O ciclo da fatura usa o dia de fechamento"
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

        <Field label="Nome" placeholder="Ex.: Nubank Roxinho" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />

        <Field label="Banco" placeholder="Ex.: Nubank" value={form.bank} onChangeText={(bank) => setForm({ ...form, bank })} />

        <Select
          label="Bandeira"
          icon="card-outline"
          value={form.type}
          onChange={(type) => setForm({ ...form, type })}
          options={BRANDS}
        />

        <View style={styles.formField}>
          <Text variant="caption" tone="secondary">
            Cor de identificação
          </Text>
          <View style={styles.colorRow}>
            {CARD_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setForm({ ...form, color })}
                accessibilityRole="button"
                accessibilityLabel={`Cor ${color}`}
                accessibilityState={{ selected: form.color === color }}
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: color,
                    borderColor: form.color === color ? theme.text.primary : "transparent",
                  },
                ]}
              >
                {form.color === color ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        <Select
          label="Dia de fechamento"
          icon="lock-closed-outline"
          value={form.closingDate}
          onChange={(closingDate) => setForm({ ...form, closingDate })}
          options={DAYS.map((day) => ({ value: day, label: `Dia ${day}` }))}
        />

        <Select
          label="Dia de vencimento"
          icon="calendar-outline"
          value={form.dueDate}
          onChange={(dueDate) => setForm({ ...form, dueDate })}
          options={DAYS.map((day) => ({ value: day, label: `Dia ${day}` }))}
        />

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

function IconButton({
  icon,
  color,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  onPress: () => void
  label: string
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: `${color}1F`, opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={16} color={color} />
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
  brandBox: {
    width: 44,
    height: 32,
    borderRadius: radius.sm - 4,
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
  formField: {
    gap: spacing.sm,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  flex: {
    flex: 1,
  },
})
