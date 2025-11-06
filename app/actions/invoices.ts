"use server"

import { invoiceService } from "@/lib/dynamodb"
import { getCurrentUser } from "./auth"

export async function getInvoicesAction() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const { invoices, paymentBlocks } = await invoiceService.generateInvoices(currentUser.id)
    return { success: true, invoices, paymentBlocks }
  } catch (error) {
    console.error("Erro ao buscar faturas:", error)
    return { error: "Erro interno do servidor" }
  }
}
