"use server"

import { getCurrentUser } from "./auth"
import { userService, transactionService } from "@/lib/dynamodb"

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

    // Calcular gastos por usuário no período atual
    const userExpenses = users.map((user) => {
      const userTransactions = allTransactions.filter((t) => {
        if (t.userId !== user.id) return false

        // Verificar se a transação está no período atual
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
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2ECC71;">To Liso - Relatório de Gastos</h2>
                <p>Olá, <strong>${userExpense.name}</strong>!</p>
                <p>Segue o resumo dos seus gastos no período <strong>${periodDisplay}</strong>:</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #e74c3c; margin-top: 0;">Total de Gastos</h3>
                  <p style="font-size: 32px; font-weight: bold; color: #e74c3c; margin: 10px 0;">
                    R$ ${userExpense.totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p style="color: #666; margin-bottom: 0;">
                    ${userExpense.transactionCount} transação${userExpense.transactionCount !== 1 ? "ões" : ""} registrada${userExpense.transactionCount !== 1 ? "s" : ""}
                  </p>
                </div>

                <p>Acesse a plataforma para ver mais detalhes sobre suas despesas.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
                
                <p style="color: #999; font-size: 12px;">
                  Este é um email automático. Por favor, não responda.
                </p>
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
