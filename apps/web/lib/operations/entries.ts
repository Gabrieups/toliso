import { entryService, invoiceService, userService } from "@/lib/dynamodb"
import { OperationError } from "@/lib/operations/transactions"
import { sendPushInBackground } from "@/lib/push"
import {
  paymentNotification,
  type CreateEntryPayload,
  type Entry,
  type Invoice,
  type PaymentBlock,
  type PublicUser,
} from "@toliso/core"

/** Regras de negócio de pagamentos (entradas) e faturas. */

/** Registra um pagamento. Admins podem lançar em nome de outro usuário. */
export async function createEntry(currentUser: PublicUser, input: CreateEntryPayload): Promise<Entry> {
  const { title, description = "", amount, targetUserId } = input

  if (!title || !amount) {
    throw new OperationError("Título e valor são obrigatórios")
  }

  if (Number.isNaN(amount) || amount <= 0) {
    throw new OperationError("O valor deve ser maior que zero")
  }

  let owner: PublicUser = currentUser

  if (currentUser.role === "admin" && targetUserId && targetUserId !== "self") {
    const targetUser = await userService.getById(targetUserId)
    if (targetUser) {
      owner = { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: targetUser.role }
    }
  }

  const entry = await entryService.create({
    userId: owner.id,
    userName: owner.name,
    userEmail: owner.email,
    title,
    description,
    amount,
    date: new Date().toISOString(),
  })

  if (owner.id !== currentUser.id) {
    sendPushInBackground(
      [owner.id],
      paymentNotification({ authorName: currentUser.name, title, amount }),
    )
  }

  return entry
}

export async function deleteEntry(entryId: string): Promise<void> {
  await entryService.delete(entryId)
}

/** Admins enxergam todos os pagamentos; demais usuários apenas os seus. */
export async function listEntries(currentUser: PublicUser): Promise<Entry[]> {
  const entries =
    currentUser.role === "admin" ? await entryService.getAll() : await entryService.getByUserId(currentUser.id)

  return entries ?? []
}

/** Faturas e blocos de pagamento do usuário autenticado. */
export async function listInvoices(
  currentUser: PublicUser,
): Promise<{ invoices: Invoice[]; paymentBlocks: PaymentBlock[] }> {
  return invoiceService.generateInvoices(currentUser.id)
}
