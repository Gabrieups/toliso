"use server"

import { transactionService, cardService, userService } from "@/lib/dynamodb"
import { getCurrentUser } from "./auth"
import { revalidatePath } from "next/cache"

interface CustomShare {
  userId: string
  userName: string
  amount: string
}

export async function createTransactionAction(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const amount = Number.parseFloat((formData.get("amount") as string).replace(",", "."))
  const cardName = formData.get("card") as string
  const installments = Number(formData.get("installments")) || 1
  const isShared = formData.get("isShared") === "true"
  const isRecurring = formData.get("isRecurring") === "true"
  const divisionType = formData.get("divisionType") as "equal" | "custom"
  const sharedUserIds = formData.get("sharedUserIds") as string
  const customSharesStr = formData.get("customShares") as string
  const targetUserId = formData.get("targetUserId") as string
  const customDate = formData.get("customDate") as string

  if (!title || !amount || !cardName) {
    return { error: "Título, valor e cartão são obrigatórios" }
  }

  if (amount <= 0) {
    return { error: "O valor deve ser maior que zero" }
  }

  if (installments < 1 || installments > 60) {
    return { error: "Número de parcelas deve ser entre 1 e 60" }
  }

  try {
    // Buscar o cartão para obter o ID
    const cards = await cardService.getAll()
    const selectedCard = cards.find((card) => card.name === cardName)

    if (!selectedCard) {
      return { error: "Cartão não encontrado" }
    }

    let primaryUser = currentUser
    if (currentUser.role === "admin" && targetUserId) {
      const targetUser = await userService.getById(targetUserId)
      if (targetUser) {
        primaryUser = targetUser
      }
    }

    let usersToShare: Array<{ id: string; name: string; email: string; amount: number }> = []

    if (isShared) {
      if (divisionType === "equal") {
        // Divisão igual
        const userIds = sharedUserIds ? JSON.parse(sharedUserIds) : []
        const allUsers = await userService.getActiveUsers()
        const selectedUsers = allUsers.filter((user) => userIds.includes(user.id))

        usersToShare = [
          {
            id: primaryUser.id,
            name: primaryUser.name,
            email: primaryUser.email,
            amount: amount / (selectedUsers.length + 1),
          },
          ...selectedUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            amount: amount / (selectedUsers.length + 1),
          })),
        ]
      } else {
        // Divisão personalizada
        const customShares: CustomShare[] = JSON.parse(customSharesStr)
        const primaryUserEmail = primaryUser.email

        // Mapear shares para usuários
        const primaryUserShare = customShares.find((s) => s.userId === primaryUserEmail)
        const otherShares = customShares.filter((s) => s.userId !== primaryUserEmail)

        const allUsers = await userService.getActiveUsers()

        usersToShare = [
          {
            id: primaryUser.id,
            name: primaryUser.name,
            email: primaryUser.email,
            amount: Number.parseFloat(primaryUserShare?.amount || "0"),
          },
        ]

        for (const share of otherShares) {
          const user = allUsers.find((u) => u.id === share.userId)
          if (user) {
            usersToShare.push({
              id: user.id,
              name: user.name,
              email: user.email,
              amount: Number.parseFloat(share.amount),
            })
          }
        }
      }
    } else {
      // Não compartilhado
      usersToShare = [{ id: primaryUser.id, name: primaryUser.name, email: primaryUser.email, amount }]
    }

    const installmentGroup =
      installments > 1 ? `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined
    const recurringGroup = isRecurring ? `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined

    const transactionsToCreate = []
    const monthsToCreate = isRecurring ? 12 : 1 // Criar 12 meses de despesas recorrentes

    const baseDate = customDate ? new Date(customDate) : new Date()

    // Criar transações para cada mês (se recorrente)
    for (let month = 0; month < monthsToCreate; month++) {
      // Criar transações para cada usuário
      for (const user of usersToShare) {
        const amountPerInstallment = user.amount / installments

        // Criar transações para cada parcela
        for (let i = 1; i <= installments; i++) {
          const installmentDate = new Date(baseDate)
          // Se recorrente, adicionar meses extras
          installmentDate.setMonth(installmentDate.getMonth() + month + (i - 1))

          let transactionTitle = title

          // Adicionar indicador de parcela
          if (installments > 1) {
            transactionTitle = `${title} (${i}/${installments})`
          }

          // Adicionar indicador de recorrência
          if (isRecurring && monthsToCreate > 1) {
            const monthName = installmentDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
            transactionTitle = `${transactionTitle} - ${monthName}`
          }

          // Adicionar indicador de compartilhamento
          if (isShared && usersToShare.length > 1) {
            if (divisionType === "custom") {
              transactionTitle = `${transactionTitle} - Parte ${user.name}`
            } else {
              transactionTitle = `${transactionTitle} - Compartilhado`
            }
          }

          transactionsToCreate.push({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            title: transactionTitle,
            description: description || "",
            amount: amountPerInstallment,
            originalAmount: amount,
            cardId: selectedCard.id,
            cardName: selectedCard.name,
            date: installmentDate.toISOString(),
            isInstallment: installments > 1,
            totalInstallments: installments > 1 ? installments : undefined,
            currentInstallment: installments > 1 ? i : undefined,
            installmentGroup,
            isShared,
            divisionType: isShared ? divisionType : undefined,
            sharedWith: isShared ? usersToShare.map((u) => u.id) : undefined,
            sharedUserNames: isShared ? usersToShare.map((u) => u.name) : undefined,
            isRecurring,
            recurringGroup,
            recurringMonth: isRecurring ? month + 1 : undefined,
          })
        }
      }
    }

    const createdTransactions = await transactionService.createMultiple(transactionsToCreate)

    revalidatePath("/")
    revalidatePath("/dashboard")
    revalidatePath("/invoices")

    let message = ""
    if (isRecurring) {
      message = `${monthsToCreate} meses de despesas recorrentes criadas`
    } else if (installments > 1) {
      message = `${installments} parcelas criadas`
    } else {
      message = "1 transação criada"
    }

    if (isShared) {
      message += ` para ${usersToShare.length} usuário${usersToShare.length > 1 ? "s" : ""}`
    }

    if (currentUser.role === "admin" && targetUserId && targetUserId !== currentUser.id) {
      message += ` para ${primaryUser.name}`
    }

    return {
      success: true,
      transactions: createdTransactions,
      message,
    }
  } catch (error) {
    console.error("Erro ao criar transação:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function deleteTransactionAction(transactionId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const allTransactions = await transactionService.getAll()
    const transaction = allTransactions.find((t) => t.id === transactionId)

    if (!transaction) {
      return { error: "Transação não encontrada" }
    }

    // Se for recorrente, perguntar se quer excluir todas
    if (transaction.recurringGroup) {
      await transactionService.deleteByRecurringGroup(transaction.recurringGroup)
    } else if (transaction.installmentGroup) {
      // Se for uma parcela, excluir todo o grupo
      await transactionService.deleteByInstallmentGroup(transaction.installmentGroup)
    } else {
      await transactionService.delete(transactionId)
    }

    revalidatePath("/")
    revalidatePath("/dashboard")
    revalidatePath("/invoices")
    return { success: true }
  } catch (error) {
    console.error("Erro ao excluir transação:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function editTransactionAction(transactionId: string, formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Apenas administradores podem editar transações" }
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const amount = Number.parseFloat((formData.get("amount") as string).replace(",", "."))
  const cardName = formData.get("card") as string
  const date = formData.get("date") as string

  if (!title || !amount || !cardName) {
    return { error: "Título, valor e cartão são obrigatórios" }
  }

  if (amount <= 0) {
    return { error: "O valor deve ser maior que zero" }
  }

  try {
    const allTransactions = await transactionService.getAll()
    const transaction = allTransactions.find((t) => t.id === transactionId)

    if (!transaction) {
      return { error: "Transação não encontrada" }
    }

    // Buscar o cartão para obter o ID
    const cards = await cardService.getAll()
    const selectedCard = cards.find((card) => card.name === cardName)

    if (!selectedCard) {
      return { error: "Cartão não encontrado" }
    }

    await transactionService.update(transactionId, {
      title,
      description: description || "",
      amount,
      cardId: selectedCard.id,
      cardName: selectedCard.name,
      date: date || transaction.date,
    })

    revalidatePath("/")
    revalidatePath("/dashboard")
    revalidatePath("/invoices")

    return {
      success: true,
      message: "Transação atualizada com sucesso",
    }
  } catch (error) {
    console.error("Erro ao editar transação:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function getTransactionsAction() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    let transactions
    if (currentUser.role === "admin") {
      transactions = await transactionService.getAll()
    } else {
      transactions = await transactionService.getByUserId(currentUser.id)
    }

    return { success: true, transactions }
  } catch (error) {
    console.error("Erro ao buscar transações:", error)
    return { error: "Erro interno do servidor" }
  }
}

export async function getActiveUsersAction() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const users = await userService.getActiveUsers()
    return { success: true, users }
  } catch (error) {
    console.error("Erro ao buscar usuários ativos:", error)
    return { error: "Erro interno do servidor" }
  }
}
