import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Chip } from "./Chip"
import { Glass } from "./Glass"
import { Text } from "./Text"
import { CardBrandMark } from "./CardBrand"
import { useTheme } from "@/theme/ThemeProvider"
import { radius, spacing } from "@/theme/tokens"
import { formatCurrency, formatDate, type CardBrand, type Entry, type Transaction } from "@toliso/core"

export interface TransactionRowProps {
  transaction: Transaction
  cardColor: string
  cardBrand: CardBrand
  /** Mostra o dono do lançamento — usado nas telas de administrador. */
  showOwner?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * Linha de despesa.
 *
 * A hierarquia é deliberada: título e valor primeiro (o que a pessoa procura),
 * metadados em etiquetas logo abaixo, ações à direita. Um só toque exclui;
 * a confirmação fica a cargo de quem chama, para poder avisar sobre parcelas.
 */
export function TransactionRow({
  transaction,
  cardColor,
  cardBrand,
  showOwner = false,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const theme = useTheme()

  return (
    <Glass variant="soft" corner="md" elevation="flat" contentStyle={styles.row}>
      <View style={[styles.stripe, { backgroundColor: cardColor }]} />

      <View style={styles.body}>
        <View style={styles.headline}>
          <Text variant="bodyStrong" numberOfLines={2} style={styles.title}>
            {transaction.title}
          </Text>
          <View style={styles.amountBlock}>
            <Text variant="amountSmall" tone="negative" tabular>
              {formatCurrency(transaction.amount)}
            </Text>
            {transaction.originalAmount && transaction.originalAmount !== transaction.amount ? (
              <Text variant="micro" tone="muted" tabular>
                total {formatCurrency(transaction.originalAmount)}
              </Text>
            ) : null}
          </View>
        </View>

        {transaction.description ? (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {transaction.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.cardChip, { backgroundColor: `${cardColor}22` }]}>
            <CardBrandMark brand={cardBrand} size="sm" />
            <Text variant="micro" style={{ color: cardColor }} numberOfLines={1}>
              {transaction.cardName}
            </Text>
          </View>

          {transaction.isInstallment && transaction.totalInstallments ? (
            <Chip
              label={`${transaction.currentInstallment}/${transaction.totalInstallments}`}
              tone="info"
              icon="layers-outline"
            />
          ) : null}

          {transaction.isRecurring ? <Chip label="Mensal" tone="info" icon="repeat-outline" /> : null}

          {transaction.isShared && transaction.sharedUserNames?.length ? (
            <Chip label={`Dividida (${transaction.sharedUserNames.length})`} tone="warning" icon="people-outline" />
          ) : null}

          {showOwner && transaction.userName ? (
            <Chip label={transaction.userName} tone="neutral" icon="person-outline" />
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text variant="micro" tone="muted">
            {formatDate(transaction.date)}
          </Text>

          <View style={styles.actions}>
            {onEdit ? (
              <IconAction icon="pencil-outline" color={theme.accent.info} onPress={onEdit} label="Editar despesa" />
            ) : null}
            {onDelete ? (
              <IconAction icon="trash-outline" color={theme.accent.danger} onPress={onDelete} label="Excluir despesa" />
            ) : null}
          </View>
        </View>

        {transaction.isShared && transaction.sharedUserNames?.length ? (
          <Text variant="micro" tone="muted" numberOfLines={1}>
            Dividida com {transaction.sharedUserNames.join(", ")}
          </Text>
        ) : null}
      </View>
    </Glass>
  )
}

export interface EntryRowProps {
  entry: Entry
  showOwner?: boolean
  onDelete?: () => void
}

/** Linha de pagamento — a contrapartida positiva da despesa. */
export function EntryRow({ entry, showOwner = false, onDelete }: EntryRowProps) {
  const theme = useTheme()

  return (
    <Glass variant="soft" corner="md" elevation="flat" contentStyle={styles.row}>
      <View style={[styles.stripe, { backgroundColor: theme.accent.positive }]} />

      <View style={styles.body}>
        <View style={styles.headline}>
          <Text variant="bodyStrong" numberOfLines={2} style={styles.title}>
            {entry.title}
          </Text>
          <Text variant="amountSmall" tone="positive" tabular>
            +{formatCurrency(entry.amount)}
          </Text>
        </View>

        {entry.description ? (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {entry.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Chip label="Pagamento" tone="positive" icon="wallet-outline" />
          {showOwner && entry.userName ? <Chip label={entry.userName} tone="neutral" icon="person-outline" /> : null}
        </View>

        <View style={styles.footer}>
          <Text variant="micro" tone="muted">
            {formatDate(entry.date)}
          </Text>

          {onDelete ? (
            <IconAction icon="trash-outline" color={theme.accent.danger} onPress={onDelete} label="Excluir pagamento" />
          ) : null}
        </View>
      </View>
    </Glass>
  )
}

function IconAction({
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
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconAction, { backgroundColor: `${color}1F`, opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  stripe: {
    width: 3,
  },
  body: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headline: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  amountBlock: {
    alignItems: "flex-end",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    maxWidth: "60%",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
})
