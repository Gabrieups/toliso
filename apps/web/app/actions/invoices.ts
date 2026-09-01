"use server"

import { getCurrentUser } from "./auth"
import { unstable_noStore as noStore } from "next/cache"
import { listInvoices } from "@/lib/operations/entries"

/** Server Action de faturas — adaptador sobre `lib/operations/entries`. */

export async function getInvoicesAction() {
  noStore()
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const { invoices, paymentBlocks } = await listInvoices(currentUser)
    return { success: true as const, invoices, paymentBlocks }
  } catch (error) {
    console.error("Erro ao buscar faturas:", error)
    return { error: "Erro interno do servidor" }
  }
}
