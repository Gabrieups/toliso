import React, { useState } from "react"
import { StyleSheet } from "react-native"
import { ApiError } from "@/api/client"
import { entriesApi } from "@/api/endpoints"
import { useAlert } from "@/components/AlertProvider"
import { Button } from "@/components/Button"
import { Field } from "@/components/Field"
import { Glass } from "@/components/Glass"
import { Select } from "@/components/Select"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { useAuth } from "@/state/auth"
import { useData } from "@/state/data"
import { spacing } from "@/theme/tokens"
import { parseAmount } from "@toliso/core"

export interface EntrySheetProps {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}

/** Formulário de novo pagamento. Admins podem registrar em nome de outro usuário. */
export function EntrySheet({ visible, onClose, onCreated }: EntrySheetProps) {
  const alert = useAlert()
  const { user, isAdmin } = useAuth()
  const { activeUsers } = useData()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [targetUserId, setTargetUserId] = useState("self")
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTitle("")
    setDescription("")
    setAmount("")
    setTargetUserId("self")
    setError(null)
  }

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    const parsed = parseAmount(amount)

    if (!title.trim()) return setError("Informe um título para o pagamento")
    if (Number.isNaN(parsed) || parsed <= 0) return setError("Informe um valor maior que zero")

    setError(null)
    setSubmitting(true)

    try {
      await entriesApi.create({
        title: title.trim(),
        description: description.trim(),
        amount: parsed,
        targetUserId: isAdmin && targetUserId !== "self" ? targetUserId : undefined,
      })

      reset()
      onClose()
      onCreated()
      alert.show({ variant: "success", message: "Pagamento registrado." })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Não foi possível registrar o pagamento")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title="Novo pagamento"
      subtitle="Abate o saldo devedor do período"
      footer={
        <>
          <Button label="Cancelar" variant="glass" onPress={handleClose} disabled={isSubmitting} style={styles.flex} />
          <Button label="Registrar" onPress={handleSubmit} loading={isSubmitting} style={styles.flex} />
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
          label="Registrar para"
          icon="person-outline"
          value={targetUserId}
          onChange={setTargetUserId}
          options={[
            { value: "self", label: "Você mesmo", description: user?.email },
            ...activeUsers
              .filter((candidate) => candidate.id !== user?.id)
              .map((candidate) => ({ value: candidate.id, label: candidate.name, description: candidate.email })),
          ]}
        />
      ) : null}

      <Field
        label="Título"
        placeholder="Ex.: Pix da fatura"
        value={title}
        onChangeText={setTitle}
        editable={!isSubmitting}
      />

      <Field
        label="Valor"
        prefix="R$"
        placeholder="0,00"
        value={amount}
        onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, ""))}
        keyboard="decimal-pad"
        editable={!isSubmitting}
      />

      <Field
        label="Descrição"
        placeholder="Detalhes adicionais (opcional)"
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
