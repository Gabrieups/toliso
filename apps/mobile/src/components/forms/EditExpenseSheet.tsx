import React, { useEffect, useState } from "react"
import { StyleSheet } from "react-native"
import { ApiError } from "@/api/client"
import { transactionsApi } from "@/api/endpoints"
import { useAlert } from "@/components/AlertProvider"
import { Button } from "@/components/Button"
import { Chip } from "@/components/Chip"
import { DatePicker } from "@/components/DatePicker"
import { Field } from "@/components/Field"
import { Glass } from "@/components/Glass"
import { Select } from "@/components/Select"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { useData } from "@/state/data"
import { spacing } from "@/theme/tokens"
import {
  formatAmount,
  getBaseTitle,
  parseAmount,
  timestampToISODate,
  toTimestamp,
  type Transaction,
} from "@toliso/core"

export interface EditExpenseSheetProps {
  transaction: Transaction | null
  onClose: () => void
  onSaved: () => void
}

/**
 * Edição de despesa (exclusiva de administradores, igual à web).
 *
 * Quando a despesa é parcelada, a alteração vale para todas as parcelas — o
 * aviso na tela deixa isso explícito antes de salvar.
 */
export function EditExpenseSheet({ transaction, onClose, onSaved }: EditExpenseSheetProps) {
  const alert = useAlert()
  const { activeCards, activeUsers } = useData()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [cardName, setCardName] = useState<string | null>(null)
  const [date, setDate] = useState("")
  const [targetUserId, setTargetUserId] = useState<string>("")
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!transaction) return

    setTitle(getBaseTitle(transaction.title.replace(/\s*\(\d+\/\d+\)\s*$/, "")))
    setDescription(transaction.description ?? "")
    setAmount(formatAmount(transaction.amount))
    setCardName(transaction.cardName)
    setDate(timestampToISODate(transaction.date))
    setTargetUserId(transaction.userId)
    setError(null)
  }, [transaction])

  const handleSubmit = async () => {
    if (!transaction) return

    const parsed = parseAmount(amount)

    if (!title.trim()) return setError("Informe um título")
    if (Number.isNaN(parsed) || parsed <= 0) return setError("Informe um valor maior que zero")
    if (!cardName) return setError("Escolha o cartão")

    setError(null)
    setSubmitting(true)

    try {
      const result = await transactionsApi.update(transaction.id, {
        title: title.trim(),
        description: description.trim(),
        amount: parsed,
        card: cardName,
        date: toTimestamp(date),
        targetUserId: targetUserId || undefined,
      })

      onClose()
      onSaved()
      alert.show({ variant: "success", message: result.message })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível salvar as alterações")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      visible={transaction !== null}
      onClose={() => !isSubmitting && onClose()}
      title="Editar despesa"
      subtitle={transaction?.cardName}
      footer={
        <>
          <Button label="Cancelar" variant="glass" onPress={onClose} disabled={isSubmitting} style={styles.flex} />
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

      {transaction?.isInstallment && transaction.totalInstallments ? (
        <Chip
          label={`As ${transaction.totalInstallments} parcelas serão atualizadas`}
          tone="warning"
          icon="information-circle-outline"
        />
      ) : null}

      <Field label="Título" value={title} onChangeText={setTitle} editable={!isSubmitting} />

      <Field
        label={transaction?.isInstallment ? "Valor da parcela" : "Valor"}
        prefix="R$"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, ""))}
        keyboard="decimal-pad"
        editable={!isSubmitting}
      />

      <Select
        label="Cartão"
        icon="card-outline"
        value={cardName}
        onChange={setCardName}
        options={activeCards.map((card) => ({
          value: card.name,
          label: card.name,
          description: card.bank,
          color: card.color,
        }))}
      />

      <DatePicker
        label={transaction?.isInstallment ? "Data da primeira parcela" : "Data"}
        value={date}
        onChange={setDate}
        disabled={isSubmitting}
      />

      <Select
        label="Responsável"
        icon="person-outline"
        value={targetUserId}
        onChange={setTargetUserId}
        options={activeUsers.map((candidate) => ({
          value: candidate.id,
          label: candidate.name,
          description: candidate.email,
        }))}
      />

      <Field
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        multiline
        editable={!isSubmitting}
      />
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
})
