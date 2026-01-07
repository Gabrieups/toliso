"use server"

import { getCurrentUser } from "./auth"
import { userService, transactionService, entryService } from "@/lib/dynamodb"

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
    if (e.recipientId !== userId || e.type !== "payment") return false

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

function getPeriodDisplay(period: string): string {
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

  const [year, month] = period.split("-").map(Number)
  const prevMonth = month === 1 ? 12 : month - 1
  const startDay = `16/${prevMonth.toString().padStart(2, "0")}`
  const endDay = `15/${month.toString().padStart(2, "0")}`

  return `${monthNames[month - 1]} (${startDay} - ${endDay})`
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
    const users = await userService.getActiveUsers()
    const user = users.find((u) => u.id === userId)

    if (!user) {
      return { error: "Usuário não encontrado" }
    }

    const allTransactions = await transactionService.getAll()
    const allEntries = await entryService.getAll()

    const targetPeriod = period || getCurrentPeriodInfo().currentPeriod
    const periodDisplay = getPeriodDisplay(targetPeriod)

    const { totalExpenses, transactionCount } = calculateUserExpenses(userId, allTransactions, targetPeriod)
    const totalPayments = calculateUserPayments(userId, allEntries, targetPeriod)
    const balance = totalExpenses - totalPayments

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.email,
        subject: `Relatório de Gastos - ${periodDisplay}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <img src="https://toliso.hezo.dev.br/ToLiso-Logo-Cor.png" alt="To Liso Logo" width="150" style="display:block;" />
                  <h2 style="color: #2ECC71; margin: 10px 0;">To Liso</h2>
                </td>
              </tr>

              <tr>
                <td align="left" style="padding: 0 20px;">
                  <p>Olá, <strong>${user.name}</strong>!</p>
                  <p>Segue o resumo dos seus gastos no período <strong>${periodDisplay}</strong>:</p>
                </td>
              </tr>

              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" 
                    style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <tr>
                      <td align="center">
                        <h3 style="color: #e74c3c; margin-top: 0;">Total de Gastos</h3>
                        <p style="font-size: 32px; font-weight: bold; color: #e74c3c; margin: 10px 0;">
                          R$ ${totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p style="color: #666; margin-bottom: 0;">
                          ${transactionCount} transa${transactionCount !== 1 ? "ções" : "ção"} registrada${transactionCount !== 1 ? "s" : ""}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center">
                  <p>Acesse a plataforma com a senha <strong>123456</strong> para ver mais detalhes sobre suas despesas.</p>
                  <a href="https://toliso.hezo.dev.br/" 
                    style="display: inline-block; padding: 10px 20px; background-color: #2ECC71; color: #fff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; margin-top: 20px;">
                    Ir para a plataforma
                  </a>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 30px 0;">
                  <hr style="border: none; border-top: 1px solid #ddd; width: 80%;" />
                  <p style="color: #999; font-size: 12px;">Este é um email automático. Por favor, não responda.</p>
                </td>
              </tr>
            </table>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      throw new Error(`Erro ao enviar email para ${user.email}`)
    }

    return { success: true, message: `Email enviado para ${user.name}!` }
  } catch (error) {
    console.error("Erro ao enviar email:", error)
    return { error: "Erro ao enviar email" }
  }
}
