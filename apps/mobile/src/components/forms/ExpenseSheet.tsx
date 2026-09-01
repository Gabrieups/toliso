import React, { useEffect, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { ApiError } from "@/api/client"
import { transactionsApi } from "@/api/endpoints"
import { useAlert } from "@/components/AlertProvider"
import { Button } from "@/components/Button"
import { Chip } from "@/components/Chip"
import { DatePicker } from "@/components/DatePicker"
import { Field } from "@/components/Field"
import { Glass } from "@/components/Glass"
import { Segmented } from "@/components/Segmented"
import { Select } from "@/components/Select"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { CheckRow, ToggleRow } from "@/components/Toggle"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { useTheme } from "@/theme/ThemeProvider"
import { spacing } from "@/theme/tokens"
import { formatCurrency, parseAmount, type CreateTransactionPayload } from "@toliso/core"

export interface ExpenseSheetProps {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}

interface Share {
  userId: string
  userName: string
  amount: string
}

const INSTALLMENT_OPTIONS = Array.from({ length: 60 }, (_, index) => index + 1)

/**
 * Formulário de nova despesa — cobre tudo que a web faz: parcelamento até 60x,
 * despesa mensal recorrente, divisão igual ou personalizada entre usuários,
 * data retroativa e lançamento em nome de outra pessoa (admin).
 */
export function ExpenseSheet({ visible, onClose, onCreated }: ExpenseSheetProps) {
  const theme = useTheme()
  const alert = useAlert()
  const { user, isAdmin } = useAuth()
  const { activeCards, activeUsers } = useData()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [cardName, setCardName] = useState<string | null>(null)
  const [installments, setInstallments] = useState(1)
  const [customDate, setCustomDate] = useState("")
  const [isRecurring, setRecurring] = useState(false)
  const [isShared, setShared] = useState(false)
  const [divisionType, setDivisionType] = useState<"equal" | "custom">("equal")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [shares, setShares] = useState<Share[]>([])
  const [targetUserId, setTargetUserId] = useState<string>("self")
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = parseAmount(amount)
  const hasValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0

  // O autor do lançamento é quem paga a "parte principal" da divisão.
  const primaryUser = useMemo(() => {
    if (isAdmin && targetUserId !== "self") {
      const target = activeUsers.find((candidate) => candidate.id === targetUserId)
      if (target) return { id: target.id, name: target.name, email: target.email }
    }
    return user ? { id: user.id, name: user.name, email: user.email } : null
  }, [isAdmin, targetUserId, activeUsers, user])

  const shareableUsers = useMemo(
    () => activeUsers.filter((candidate) => candidate.id !== primaryUser?.id),
    [activeUsers, primaryUser],
  )

  // Recalcula as fatias sempre que a divisão muda.
  useEffect(() => {
    if (!isShared || selectedUserIds.length === 0 || !primaryUser) {
      setShares([])
      return
    }

    const participants = [
      { userId: primaryUser.email, userName: primaryUser.name },
      ...shareableUsers
        .filter((candidate) => selectedUserIds.includes(candidate.id))
        .map((candidate) => ({ userId: candidate.id, userName: candidate.name })),
    ]

    if (divisionType === "equal") {
      const perUser = hasValidAmount ? parsedAmount / participants.length : 0
      setShares(participants.map((participant) => ({ ...participant, amount: perUser.toFixed(2) })))
      return
    }

    setShares((previous) =>
      participants.map((participant) => ({
        ...participant,
        amount: previous.find((share) => share.userId === participant.userId)?.amount ?? "0,00",
      })),
    )
  }, [isShared, selectedUserIds, divisionType, parsedAmount, hasValidAmount, primaryUser, shareableUsers])

  const sharesTotal = shares.reduce((total, share) => total + (parseAmount(share.amount) || 0), 0)
  const sharesMatch = !hasValidAmount || Math.abs(sharesTotal - parsedAmount) <= 0.01

  const reset = () => {
    setTitle("")
    setDescription("")
    setAmount("")
    setCardName(null)
    setInstallments(1)
    setCustomDate("")
    setRecurring(false)
    setShared(false)
    setDivisionType("equal")
    setSelectedUserIds([])
    setShares([])
    setTargetUserId("self")
    setError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!title.trim()) return setError("Informe um título para a despesa")
    if (!hasValidAmount) return setError("Informe um valor maior que zero")
    if (!cardName) return setError("Escolha o cartão usado")
    if (isShared && selectedUserIds.length === 0) return setError("Selecione com quem dividir a despesa")
    if (isShared && divisionType === "custom" && !sharesMatch) {
      return setError(
        `A soma das partes (${formatCurrency(sharesTotal)}) precisa fechar com o total (${formatCurrency(parsedAmount)})`,
      )
    }

    setError(null)
    setSubmitting(true)

    const payload: CreateTransactionPayload = {
      title: title.trim(),
      description: description.trim(),
      amount: parsedAmount,
      card: cardName,
      installments,
      isShared,
      isRecurring,
      divisionType,
      sharedUserIds: isShared && divisionType === "equal" ? selectedUserIds : undefined,
      customShares:
        isShared && divisionType === "custom"
          ? shares.map((share) => ({ ...share, amount: String(parseAmount(share.amount) || 0) }))
          : undefined,
      targetUserId: isAdmin && targetUserId !== "self" ? targetUserId : undefined,
      customDate: customDate || undefined,
    }

    try {
      const result = await transactionsApi.create(payload)
      reset()
      onClose()
      onCreated()
      alert.show({ variant: "success", message: result.message })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível salvar a despesa")
    } finally {
      setSubmitting(false)
    }
  }

  const installmentValue = hasValidAmount ? parsedAmount / installments : 0

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title="Nova despesa"
      subtitle="Lançamento no cartão de crédito"
      footer={
        <>
          <Button label="Cancelar" variant="glass" onPress={handleClose} disabled={isSubmitting} style={styles.flex} />
          <Button label="Salvar" onPress={handleSubmit} loading={isSubmitting} style={styles.flex} />
        </>
      }
    >
      {error ? (
        <Glass variant="soft" corner="md" elevation="flat" contentStyle={styles.errorBox}>
          <Text variant="caption" tone="negative">
            {error}
          </Text>
        </Glass>
      ) : null}

      {isAdmin ? (
        <Select
          label="Lançar para"
          icon="person-outline"
          value={targetUserId}
          onChange={(value) => {
            setTargetUserId(value)
            setSelectedUserIds([])
          }}
          options={[
            { value: "self", label: "Você mesmo", description: user?.email },
            ...activeUsers
              .filter((candidate) => candidate.id !== user?.id)
              .map((candidate) => ({
                value: candidate.id,
                label: candidate.name,
                description: candidate.email,
              })),
          ]}
        />
      ) : null}

      <Field
        label="Título"
        placeholder="Ex.: Mercado do mês"
        value={title}
        onChangeText={setTitle}
        editable={!isSubmitting}
      />

      <Field
        label="Valor total"
        prefix="R$"
        placeholder="0,00"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, ""))}
        keyboard="decimal-pad"
        editable={!isSubmitting}
      />

      <Select
        label="Cartão"
        placeholder="Escolha o cartão"
        icon="card-outline"
        value={cardName}
        onChange={setCardName}
        options={activeCards.map((card) => ({
          value: card.name,
          label: card.name,
          description: `${card.bank} · fecha dia ${card.closingDate}`,
          color: card.color,
        }))}
      />

      <Select
        label="Parcelas"
        icon="layers-outline"
        value={String(installments)}
        onChange={(value) => setInstallments(Number(value))}
        options={INSTALLMENT_OPTIONS.map((count) => ({
          value: String(count),
          label: count === 1 ? "À vista" : `${count}x`,
        }))}
      />

      {installments > 1 && hasValidAmount ? (
        <Chip label={`${installments}x de ${formatCurrency(installmentValue)}`} tone="info" icon="calculator-outline" />
      ) : null}

      <DatePicker
        label="Data da despesa"
        hint="Deixe vazio para usar a data de hoje."
        placeholder="Hoje"
        value={customDate}
        onChange={setCustomDate}
        disabled={isSubmitting}
        clearable
      />

      <Field
        label="Descrição"
        placeholder="Detalhes adicionais (opcional)"
        value={description}
        onChangeText={setDescription}
        multiline
        editable={!isSubmitting}
      />

      <ToggleRow
        label="Despesa mensal"
        description="Repete automaticamente pelos próximos 12 meses"
        icon="repeat-outline"
        value={isRecurring}
        onChange={setRecurring}
        disabled={isSubmitting}
      />

      <ToggleRow
        label="Dividir com outras pessoas"
        description="Cada pessoa recebe a sua parte na própria fatura"
        icon="people-outline"
        value={isShared}
        onChange={(next) => {
          setShared(next)
          if (!next) {
            setSelectedUserIds([])
            setShares([])
          }
        }}
        disabled={isSubmitting}
      />

      {isShared ? (
        <View style={styles.sharedBlock}>
          <Text variant="caption" tone="secondary">
            Quem participa desta despesa
          </Text>

          {shareableUsers.length === 0 ? (
            <Text variant="caption" tone="muted">
              Nenhum outro usuário ativo disponível.
            </Text>
          ) : (
            <View style={styles.userList}>
              {shareableUsers.map((candidate) => (
                <CheckRow
                  key={candidate.id}
                  label={candidate.name}
                  description={candidate.email}
                  checked={selectedUserIds.includes(candidate.id)}
                  onChange={(checked) =>
                    setSelectedUserIds((previous) =>
                      checked ? [...previous, candidate.id] : previous.filter((id) => id !== candidate.id),
                    )
                  }
                />
              ))}
            </View>
          )}

          {selectedUserIds.length > 0 ? (
            <>
              <Segmented
                value={divisionType}
                onChange={setDivisionType}
                options={[
                  { value: "equal", label: "Partes iguais" },
                  { value: "custom", label: "Valores próprios" },
                ]}
              />

              <Glass variant="soft" corner="md" elevation="flat" contentStyle={styles.sharesBox}>
                {divisionType === "equal" ? (
                  <Text variant="caption" tone="secondary">
                    {selectedUserIds.length + 1} pessoas ·{" "}
                    {hasValidAmount
                      ? `${formatCurrency(parsedAmount / (selectedUserIds.length + 1))} para cada`
                      : "informe o valor total"}
                  </Text>
                ) : (
                  <>
                    {shares.map((share) => (
                      <Field
                        key={share.userId}
                        label={share.userName}
                        prefix="R$"
                        placeholder="0,00"
                        value={share.amount}
                        keyboard="decimal-pad"
                        onChangeText={(text) =>
                          setShares((previous) =>
                            previous.map((item) =>
                              item.userId === share.userId
                                ? { ...item, amount: text.replace(/[^0-9.,]/g, "") }
                                : item,
                            ),
                          )
                        }
                      />
                    ))}

                    <View style={styles.sharesTotal}>
                      <Text variant="caption" tone="secondary">
                        Soma das partes
                      </Text>
                      <Text
                        variant="bodyStrong"
                        tabular
                        style={{ color: sharesMatch ? theme.accent.positive : theme.accent.danger }}
                      >
                        {formatCurrency(sharesTotal)}
                      </Text>
                    </View>
                  </>
                )}
              </Glass>
            </>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  errorBox: {
    padding: spacing.md,
  },
  sharedBlock: {
    gap: spacing.md,
  },
  userList: {
    gap: spacing.sm,
  },
  sharesBox: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sharesTotal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
})
