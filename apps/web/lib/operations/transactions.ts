import { cardService, transactionService, userService } from "@/lib/dynamodb"
import { sendPushInBackground } from "@/lib/push"
import {
  expenseForYouNotification,
  fromISODate,
  sharedExpenseNotification,
  toTimestamp,
  type CreateTransactionPayload,
  type PublicUser,
  type Transaction,
  type UpdateTransactionPayload,
} from "@toliso/core"

/**
 * Regras de negócio de despesas.
 *
 * Este módulo é a única implementação: as Server Actions da web e as rotas REST
 * `/api/v1` consumidas pelo aplicativo mobile chamam exatamente estas funções.
 */

interface UserShare {
  id: string
  name: string
  email: string
  amount: number
}

export interface CreateTransactionResult {
  transactions: Transaction[]
  message: string
}

/**
 * Cria uma despesa, expandindo-a em quantas linhas forem necessárias:
 * uma por usuário (quando dividida), por parcela e por mês (quando recorrente).
 */
export async function createTransaction(
  currentUser: PublicUser,
  input: CreateTransactionPayload,
): Promise<CreateTransactionResult> {
  const {
    title,
    description = "",
    amount,
    card: cardName,
    installments = 1,
    isShared = false,
    isRecurring = false,
    divisionType = "equal",
    sharedUserIds = [],
    customShares = [],
    targetUserId,
    customDate,
  } = input

  if (!title || !amount || !cardName) {
    throw new OperationError("Título, valor e cartão são obrigatórios")
  }

  if (Number.isNaN(amount) || amount <= 0) {
    throw new OperationError("O valor deve ser maior que zero")
  }

  if (installments < 1 || installments > 60) {
    throw new OperationError("Número de parcelas deve ser entre 1 e 60")
  }

  const cards = await cardService.getAll()
  const selectedCard = cards.find((card) => card.name === cardName)

  if (!selectedCard) {
    throw new OperationError("Cartão não encontrado")
  }

  let primaryUser: PublicUser = currentUser
  if (currentUser.role === "admin" && targetUserId && targetUserId !== "self") {
    const targetUser = await userService.getById(targetUserId)
    if (targetUser) {
      primaryUser = {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      }
    }
  }

  const usersToShare = await resolveShares({
    primaryUser,
    amount,
    isShared,
    divisionType,
    sharedUserIds,
    customShares,
  })

  const installmentGroup =
    installments > 1 ? `inst_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` : undefined
  const recurringGroup = isRecurring ? `rec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` : undefined

  const transactionsToCreate: Array<Omit<Transaction, "id" | "createdAt" | "updatedAt">> = []
  const monthsToCreate = isRecurring ? 12 : 1 // Recorrente gera 12 meses adiante

  // `new Date("2025-08-31")` é meia-noite UTC, que no Brasil cai no dia 30.
  // `fromISODate` ancora ao meio-dia local e preserva o dia escolhido.
  const baseDate = customDate ? (fromISODate(customDate) ?? new Date(customDate)) : new Date()

  if (Number.isNaN(baseDate.getTime())) {
    throw new OperationError("Data da despesa inválida")
  }

  for (let month = 0; month < monthsToCreate; month++) {
    for (const user of usersToShare) {
      const amountPerInstallment = user.amount / installments

      for (let installment = 1; installment <= installments; installment++) {
        const installmentDate = new Date(baseDate)
        installmentDate.setMonth(installmentDate.getMonth() + month + (installment - 1))

        let transactionTitle = title

        if (installments > 1) {
          transactionTitle = `${title} (${installment}/${installments})`
        }

        if (isRecurring && monthsToCreate > 1) {
          const monthName = installmentDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
          transactionTitle = `${transactionTitle} - ${monthName}`
        }

        if (isShared && usersToShare.length > 1) {
          transactionTitle =
            divisionType === "custom"
              ? `${transactionTitle} - Parte ${user.name}`
              : `${transactionTitle} - Compartilhado`
        }

        transactionsToCreate.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          title: transactionTitle,
          description,
          amount: amountPerInstallment,
          originalAmount: amount,
          cardId: selectedCard.id,
          cardName: selectedCard.name,
          date: installmentDate.toISOString(),
          isInstallment: installments > 1,
          totalInstallments: installments > 1 ? installments : undefined,
          currentInstallment: installments > 1 ? installment : undefined,
          installmentGroup,
          isShared,
          divisionType: isShared ? divisionType : undefined,
          sharedWith: isShared ? usersToShare.map((entry) => entry.id) : undefined,
          sharedUserNames: isShared ? usersToShare.map((entry) => entry.name) : undefined,
          isRecurring,
          recurringGroup,
          recurringMonth: isRecurring ? month + 1 : undefined,
        })
      }
    }
  }

  const createdTransactions = await transactionService.createMultiple(transactionsToCreate)

  notifyExpenseParticipants({ currentUser, primaryUser, usersToShare, isShared, title, cardName: selectedCard.name })

  return {
    transactions: createdTransactions,
    message: buildCreationMessage({
      isRecurring,
      monthsToCreate,
      installments,
      isShared,
      shareCount: usersToShare.length,
      currentUser,
      primaryUser,
    }),
  }
}

/** Exclui uma despesa. Parcelas e recorrências são removidas em grupo. */
export async function deleteTransaction(transactionId: string): Promise<void> {
  const allTransactions = await transactionService.getAll()
  const transaction = allTransactions.find((item) => item.id === transactionId)

  if (!transaction) {
    throw new OperationError("Transação não encontrada", 404)
  }

  if (transaction.recurringGroup) {
    await transactionService.deleteByRecurringGroup(transaction.recurringGroup)
  } else if (transaction.installmentGroup) {
    await transactionService.deleteByInstallmentGroup(transaction.installmentGroup)
  } else {
    await transactionService.delete(transactionId)
  }
}

/** Edita uma despesa. Quando parcelada, todas as parcelas são atualizadas. */
export async function editTransaction(
  transactionId: string,
  input: UpdateTransactionPayload,
): Promise<{ message: string }> {
  const { title, description = "", amount, card: cardName, date, targetUserId } = input

  if (!title || !amount || !cardName) {
    throw new OperationError("Título, valor e cartão são obrigatórios")
  }

  if (Number.isNaN(amount) || amount <= 0) {
    throw new OperationError("O valor deve ser maior que zero")
  }

  const allTransactions = await transactionService.getAll()
  const transaction = allTransactions.find((item) => item.id === transactionId)

  if (!transaction) {
    throw new OperationError("Transação não encontrada", 404)
  }

  const cards = await cardService.getAll()
  const selectedCard = cards.find((card) => card.name === cardName)

  if (!selectedCard) {
    throw new OperationError("Cartão não encontrado")
  }

  let targetUser = null
  if (targetUserId && targetUserId !== transaction.userId) {
    targetUser = await userService.getById(targetUserId)
    if (!targetUser) {
      throw new OperationError("Usuário não encontrado", 404)
    }
  }

  if (transaction.installmentGroup) {
    const installmentTransactions = await transactionService.getByInstallmentGroup(transaction.installmentGroup)
    installmentTransactions.sort((a, b) => (a.currentInstallment || 0) - (b.currentInstallment || 0))

    const firstInstallment = installmentTransactions[0]
    if (!firstInstallment) {
      throw new OperationError("Parcelas não encontradas", 404)
    }

    const originalDate = new Date(firstInstallment.date)
    const newDate = new Date(toTimestamp(date) ?? transaction.date)
    const monthsDiff =
      (newDate.getFullYear() - originalDate.getFullYear()) * 12 + (newDate.getMonth() - originalDate.getMonth())

    for (const installment of installmentTransactions) {
      const installmentDate = new Date(installment.date)
      installmentDate.setMonth(installmentDate.getMonth() + monthsDiff)

      const updates: Record<string, unknown> = {
        title: `${title} (${installment.currentInstallment}/${installment.totalInstallments})`,
        description,
        amount,
        cardId: selectedCard.id,
        cardName: selectedCard.name,
        date: installmentDate.toISOString(),
      }

      if (targetUser) {
        updates.userId = targetUser.id
        updates.userName = targetUser.name
        updates.userEmail = targetUser.email
      }

      await transactionService.update(installment.id, updates)
    }

    return { message: `${installmentTransactions.length} parcelas atualizadas com sucesso` }
  }

  const updates: Record<string, unknown> = {
    title,
    description,
    amount,
    cardId: selectedCard.id,
    cardName: selectedCard.name,
    date: toTimestamp(date) ?? transaction.date,
  }

  if (targetUser) {
    updates.userId = targetUser.id
    updates.userName = targetUser.name
    updates.userEmail = targetUser.email
  }

  await transactionService.update(transactionId, updates)

  return { message: "Transação atualizada com sucesso" }
}

/** Admins enxergam tudo; demais usuários apenas o que é seu ou dividido com eles. */
export async function listTransactions(currentUser: PublicUser): Promise<Transaction[]> {
  const transactions =
    currentUser.role === "admin"
      ? await transactionService.getAll()
      : await transactionService.getByUserId(currentUser.id)

  return transactions ?? []
}

// --- Auxiliares internos -------------------------------------------------

async function resolveShares(params: {
  primaryUser: PublicUser
  amount: number
  isShared: boolean
  divisionType: "equal" | "custom"
  sharedUserIds: string[]
  customShares: Array<{ userId: string; userName: string; amount: string }>
}): Promise<UserShare[]> {
  const { primaryUser, amount, isShared, divisionType, sharedUserIds, customShares } = params

  if (!isShared) {
    return [{ id: primaryUser.id, name: primaryUser.name, email: primaryUser.email, amount }]
  }

  const allUsers = await userService.getActiveUsers()

  if (divisionType === "equal") {
    const selectedUsers = allUsers.filter((user) => sharedUserIds.includes(user.id))
    const amountPerUser = amount / (selectedUsers.length + 1)

    return [
      { id: primaryUser.id, name: primaryUser.name, email: primaryUser.email, amount: amountPerUser },
      ...selectedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        amount: amountPerUser,
      })),
    ]
  }

  // Divisão personalizada: a fatia do autor vem identificada pelo e-mail dele.
  const primaryShare = customShares.find((share) => share.userId === primaryUser.email)
  const otherShares = customShares.filter((share) => share.userId !== primaryUser.email)

  const shares: UserShare[] = [
    {
      id: primaryUser.id,
      name: primaryUser.name,
      email: primaryUser.email,
      amount: Number.parseFloat(primaryShare?.amount || "0"),
    },
  ]

  for (const share of otherShares) {
    const user = allUsers.find((candidate) => candidate.id === share.userId)
    if (user) {
      shares.push({
        id: user.id,
        name: user.name,
        email: user.email,
        amount: Number.parseFloat(share.amount),
      })
    }
  }

  return shares
}

function notifyExpenseParticipants(params: {
  currentUser: PublicUser
  primaryUser: PublicUser
  usersToShare: UserShare[]
  isShared: boolean
  title: string
  cardName: string
}) {
  const { currentUser, primaryUser, usersToShare, isShared, title, cardName } = params

  if (isShared) {
    const others = usersToShare.filter((share) => share.id !== currentUser.id)
    for (const share of others) {
      sendPushInBackground(
        [share.id],
        sharedExpenseNotification({
          authorName: currentUser.name,
          title,
          amount: share.amount,
          cardName,
        }),
      )
    }
    return
  }

  // Admin lançando despesa em nome de outra pessoa.
  if (primaryUser.id !== currentUser.id) {
    sendPushInBackground(
      [primaryUser.id],
      expenseForYouNotification({
        authorName: currentUser.name,
        title,
        amount: usersToShare[0]?.amount ?? 0,
        cardName,
      }),
    )
  }
}

function buildCreationMessage(params: {
  isRecurring: boolean
  monthsToCreate: number
  installments: number
  isShared: boolean
  shareCount: number
  currentUser: PublicUser
  primaryUser: PublicUser
}): string {
  const { isRecurring, monthsToCreate, installments, isShared, shareCount, currentUser, primaryUser } = params

  let message: string
  if (isRecurring) {
    message = `${monthsToCreate} meses de despesas recorrentes criadas`
  } else if (installments > 1) {
    message = `${installments} parcelas criadas`
  } else {
    message = "1 transação criada"
  }

  if (isShared) {
    message += ` para ${shareCount} usuário${shareCount > 1 ? "s" : ""}`
  }

  if (currentUser.role === "admin" && primaryUser.id !== currentUser.id) {
    message += ` para ${primaryUser.name}`
  }

  return message
}

/** Erro de regra de negócio com código HTTP associado. */
export class OperationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
    this.name = "OperationError"
  }
}
