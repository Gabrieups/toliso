"use server"

import { getCurrentUser } from "./auth"
import { userService, transactionService } from "@/lib/dynamodb"

export async function sendIndividualExpenseReportAction(userId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Acesso negado. Apenas administradores podem enviar relatórios." }
  }

  try {
    const user = await userService.getById(userId)

    if (!user || !user.status) {
      return { error: "Usuário não encontrado." }
    }

    const allTransactions = await transactionService.getAll()

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const day = now.getDate()

    let currentPeriod: string
    let periodDisplay: string

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ]

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

    const totalExpenses = userTransactions.reduce((sum, t) => sum + Number(t.amount), 0)

    const userExpenseData = {
      name: user.name,
      email: user.email,
      totalExpenses,
      transactionCount: userTransactions.length,
    }

    const emailPromises = [
      (async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-email`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: userExpenseData.email,
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
                          <p>Olá, <strong>${userExpenseData.name}</strong>!</p>
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
                                  R$ ${userExpenseData.totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                                <p style="color: #666; margin-bottom: 0;">
                                  ${userExpenseData.transactionCount} transa${userExpenseData.transactionCount !== 1 ? "ções" : "ção"} registrada${userExpenseData.transactionCount !== 1 ? "s" : ""}
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
            }
          )

          if (!response.ok) {
            throw new Error("Erro ao enviar email")
          }

          return { success: true, email: userExpenseData.email }
        } catch (error) {
          console.error("Erro ao enviar email:", error)
          return { success: false, email: userExpenseData.email }
        }
      })(),
    ]

    const results = await Promise.all(emailPromises)

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    if (failCount > 0) {
      return {
        success: true,
        message: `${successCount} enviado(s), ${failCount} falhou.`,
        partial: true,
      }
    }

    return {
      success: true,
      message: `${successCount} email enviado com sucesso!`,
    }
  } catch (error) {
    console.error("Erro ao enviar relatórios:", error)
    return { error: "Erro ao enviar relatórios" }
  }
}
