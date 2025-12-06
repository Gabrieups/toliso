"use server"

import { getCurrentUser } from "./auth"
import { userService, transactionService, entryService } from "@/lib/dynamodb"

function getCurrentPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  if (day >= 16) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    return `${nextYear}-${nextMonth.toString().padStart(2, "0")}`
  } else {
    return `${year}-${month.toString().padStart(2, "0")}`
  }
}

function getPeriodFromDate(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (day >= 16) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    return `${nextYear}-${nextMonth.toString().padStart(2, "0")}`
  } else {
    return `${year}-${month.toString().padStart(2, "0")}`
  }
}

export async function calculateUserBalance(userId: string) {
  try {
    const allTransactions = await transactionService.getByUserId(userId)
    const allEntries = await entryService.getByUserId(userId)

    const currentPeriod = getCurrentPeriod()

    const periodTransactions = allTransactions.filter((t) => {
      if (t.userId !== userId) return false

      const transactionPeriod = getPeriodFromDate(new Date(t.date))
      return transactionPeriod === currentPeriod
    })

    const totalExpenses = periodTransactions.reduce((sum, t) => sum + t.amount, 0)

    const periodEntries = allEntries.filter((e) => {
      const entryPeriod = getPeriodFromDate(new Date(e.date))
      return entryPeriod === currentPeriod
    })

    const totalPayments = periodEntries.reduce((sum, e) => sum + e.amount, 0)

    return {
      totalExpenses,
      totalPayments,
      balance: totalExpenses - totalPayments,
      period: currentPeriod,
    }
  } catch (error) {
    console.error("Erro ao calcular saldo:", error)
    return {
      totalExpenses: 0,
      totalPayments: 0,
      balance: 0,
      period: "",
    }
  }
}


export async function sendIndividualExpenseReportAction(userId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem enviar relatórios." }
  }

  try {
    const user = await userService.getById(userId)

    if (!user) {
      return { error: "Usuário não encontrado" }
    }

    if (user.status !== "active") {
      return { error: "Usuário inativo" }
    }

    const allTransactions = await transactionService.getByUserId(userId)

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()

    let currentPeriod: string
    let periodDisplay: string

    if (day >= 16) {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      currentPeriod = `${nextYear}-${nextMonth.toString().padStart(2, "0")}`

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
      const startDay = `16/${month.toString().padStart(2, "0")}`
      const endDay = `15/${nextMonth.toString().padStart(2, "0")}`
      periodDisplay = `${monthNames[nextMonth - 1]} (${startDay} - ${endDay})`
    } else {
      currentPeriod = `${year}-${month.toString().padStart(2, "0")}`

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
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const startDay = `16/${prevMonth.toString().padStart(2, "0")}`
      const endDay = `15/${month.toString().padStart(2, "0")}`
      periodDisplay = `${monthNames[month - 1]} (${startDay} - ${endDay})`
    }

    const userTransactions = allTransactions.filter((t) => {
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

    try {
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
                            ${userTransactions.length} transa${userTransactions.length !== 1 ? "ções" : "ção"} registrada${userTransactions.length !== 1 ? "s" : ""}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p>Acesse a plataforma para ver mais detalhes sobre suas despesas.</p>
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

      return {
        success: true,
        message: `Email enviado com sucesso para ${user.name}`,
      }
    } catch (error) {
      console.error(`Erro ao enviar email para ${user.email}:`, error)
      return {
        success: false,
        error: `Erro ao enviar email para ${user.name}`,
      }
    }
  } catch (error) {
    console.error("Erro ao enviar relatório:", error)
    return { error: "Erro ao enviar relatório" }
  }
}

export async function sendExpenseReportAction() {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem enviar relatórios." }
  }

  try {
    const users = await userService.getActiveUsers()

    if (users.length === 0) {
      return { error: "Nenhum usuário ativo encontrado" }
    }

    const allTransactions = await transactionService.getAll()

    const currentPeriod = getCurrentPeriod()

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

    let periodDisplay: string
    if (currentPeriod.split("-")[1] === "01") {
      periodDisplay = `${monthNames[11]} (${16}/${12} - ${15}/01)}`
    } else {
      const prevMonth = Number.parseInt(currentPeriod.split("-")[1]) - 1
      periodDisplay = `${monthNames[prevMonth - 1]} (${16}/${prevMonth} - ${15}/${currentPeriod.split("-")[1]})`
    }

    // Calcular gastos por usuário no período atual
    const userExpenses = users.map((user) => {
      const userTransactions = allTransactions.filter((t) => {
        if (t.userId !== user.id) return false

        // Verificar se a transação está no período atual
        const transactionDate = new Date(t.date)
        const transactionPeriod = getPeriodFromDate(transactionDate)
        return transactionPeriod === currentPeriod
      })

      const totalExpenses = userTransactions.reduce((sum, t) => sum + t.amount, 0)

      return {
        name: user.name,
        email: user.email,
        totalExpenses,
        transactionCount: userTransactions.length,
      }
    })

    // Enviar emails
    const emailPromises = userExpenses.map(async (userExpense) => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: userExpense.email,
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
                    <p>Olá, <strong>${userExpense.name}</strong>!</p>
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
                            R$ ${userExpense.totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p style="color: #666; margin-bottom: 0;">
                            ${userExpense.transactionCount} transa${userExpense.transactionCount !== 1 ? "ções" : "ção"} registrada${userExpense.transactionCount !== 1 ? "s" : ""}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center">
                    <p>Acesse a plataforma para ver mais detalhes sobre suas despesas.</p>
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
          throw new Error(`Erro ao enviar email para ${userExpense.email}`)
        }

        return { success: true, email: userExpense.email }
      } catch (error) {
        console.error(`Erro ao enviar email para ${userExpense.email}:`, error)
        return { success: false, email: userExpense.email, error }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (failCount > 0) {
      return {
        success: true,
        message: `${successCount} email(s) enviado(s) com sucesso. ${failCount} falha(s).`,
        partial: true,
      }
    }

    return {
      success: true,
      message: `${successCount} email(s) enviado(s) com sucesso!`,
    }
  } catch (error) {
    console.error("Erro ao enviar relatórios:", error)
    return { error: "Erro ao enviar relatórios" }
  }
}
