"use server"

import { invoiceService } from "@/lib/dynamodb"
import { getCurrentUser } from "./auth"
import { unstable_noStore as noStore } from "next/cache"

export async function getInvoicesAction() {
  noStore()
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
