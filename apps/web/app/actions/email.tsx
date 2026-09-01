"use server"

import { getCurrentUser } from "./auth"
import { userService, transactionService, entryService } from "@/lib/dynamodb"
import { sendUserExpenseReport } from "@/lib/operations/reports"
import { OperationError } from "@/lib/operations/transactions"

function getCurrentPeriodInfo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]

  let currentPeriod: string
  let periodDisplay: string

  if (day >= 16) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    currentPeriod = `${nextYear}-${nextMonth.toString().padStart(2, "0")}`
    const startDay = `16/${month.toString().padStart(2, "0")}`
    const endDay = `15/${nextMonth.toString().padStart(2, "0")}`
    periodDisplay = `${monthNames[nextMonth - 1]} (${startDay} - ${endDay})`
  } else {
    currentPeriod = `${year}-${month.toString().padStart(2, "0")}`
    const prevMonth = month === 1 ? 12 : month - 1
    const startDay = `16/${prevMonth.toString().padStart(2, "0")}`
    const endDay = `15/${month.toString().padStart(2, "0")}`
    periodDisplay = `${monthNames[month - 1]} (${startDay} - ${endDay})`
  }

  return { currentPeriod, periodDisplay }
}

function calculateUserExpenses(userId: string, allTransactions: any[], currentPeriod: string) {
  const userTransactions = allTransactions.filter((t) => {
    if (t.userId !== userId) return false

    const transactionDate = new Date(t.date)
    const tYear = transactionDate.getFullYear()
    const tMonth = transactionDate.getMonth() + 1
    const tDay = transactionDate.getDate()

    let transactionPeriod: string
    if (tDay >= 16) {
      const nextMonth = tMonth === 12 ? 1 : tMonth + 1
      const nextYear = tMonth === 12 ? tYear + 1 : tYear
      transactionPeriod = `${nextYear}-${nextMonth.toString().padStart(2, "0")}`
    } else {
      transactionPeriod = `${tYear}-${tMonth.toString().padStart(2, "0")}`
    }

    return transactionPeriod === currentPeriod
  })

  const totalExpenses = userTransactions.reduce((sum, t) => sum + t.amount, 0)
  return { totalExpenses, transactionCount: userTransactions.length }
}

function calculateUserPayments(userId: string, allEntries: any[], currentPeriod: string) {
  const userPayments = allEntries.filter((e) => {
    if (e.userId !== userId) return false

    const entryDate = new Date(e.date)
    const eYear = entryDate.getFullYear()
    const eMonth = entryDate.getMonth() + 1
    const eDay = entryDate.getDate()

    let entryPeriod: string
    if (eDay >= 16) {
      const nextMonth = eMonth === 12 ? 1 : eMonth + 1
      const nextYear = eMonth === 12 ? eYear + 1 : eYear
      entryPeriod = `${nextYear}-${nextMonth.toString().padStart(2, "0")}`
    } else {
      entryPeriod = `${eYear}-${eMonth.toString().padStart(2, "0")}`
    }

    return entryPeriod === currentPeriod
  })

  return userPayments.reduce((sum, e) => sum + e.amount, 0)
}

export async function getUsersExpensesAction(period?: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado" }
  }

  try {
    const users = await userService.getActiveUsers()
    const allTransactions = await transactionService.getAll()
    const allEntries = await entryService.getAll()
    const targetPeriod = period || getCurrentPeriodInfo().currentPeriod

    const usersWithExpenses = users.map((user) => {
      const { totalExpenses } = calculateUserExpenses(user.id, allTransactions, targetPeriod)
      const totalPayments = calculateUserPayments(user.id, allEntries, targetPeriod)
      const balance = totalExpenses - totalPayments

      return {
        id: user.id,
        totalExpenses,
        totalPayments,
        balance,
      }
    })

    return { success: true, usersExpenses: usersWithExpenses }
  } catch (error) {
    console.error("Erro ao calcular gastos dos usuários:", error)
    return { error: "Erro ao calcular gastos" }
  }
}

export async function sendIndividualExpenseReportAction(userId: string, period?: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem enviar relatórios." }
  }

  try {
    const result = await sendUserExpenseReport(userId, period)
    return { success: true, message: result.message }
  } catch (error) {
    if (error instanceof OperationError) return { error: error.message }
    console.error("Erro ao enviar email:", error)
    return { error: "Erro ao enviar email" }
  }
}
