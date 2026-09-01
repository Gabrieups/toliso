import { cardService, userService } from "@/lib/dynamodb"
import { OperationError } from "@/lib/operations/transactions"
import type { CardPayload, CreditCard, PublicUser, User, UserPayload } from "@toliso/core"

/** Regras de negócio de administração: cartões e usuários. */

// --- Cartões -------------------------------------------------------------

export async function listCards(): Promise<CreditCard[]> {
  return (await cardService.getAll()) ?? []
}

export async function createCard(input: CardPayload): Promise<CreditCard> {
  const { name, bank, type, color, status = "active", dueDate = 10, closingDate = 5 } = input

  if (!name || !bank || !type || !color) {
    throw new OperationError("Todos os campos obrigatórios devem ser preenchidos")
  }

  return cardService.create({ name, bank, type, color, status, dueDate, closingDate })
}

export async function updateCard(cardId: string, input: CardPayload): Promise<void> {
  const { name, bank, type, color, status, dueDate, closingDate } = input
  await cardService.update(cardId, { name, bank, type, color, status, dueDate, closingDate })
}

export async function deleteCard(cardId: string): Promise<void> {
  await cardService.delete(cardId)
}

// --- Usuários ------------------------------------------------------------

/** Remove a senha antes de devolver usuários para qualquer cliente. */
export function toPublicUser(user: User): PublicUser & { status: User["status"]; createdAt: string } {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  }
}

export async function listUsers(): Promise<Array<ReturnType<typeof toPublicUser>>> {
  const users = (await userService.getAll()) ?? []
  return users.map(toPublicUser)
}

export async function listActiveUsers(): Promise<Array<ReturnType<typeof toPublicUser>>> {
  const users = (await userService.getActiveUsers()) ?? []
  return users.map(toPublicUser)
}

export async function createUser(input: UserPayload): Promise<User> {
  const { name, email, password, role = "user", status = "active" } = input

  if (!name || !email || !password) {
    throw new OperationError("Todos os campos são obrigatórios")
  }

  const existingUser = await userService.getByEmail(email)
  if (existingUser) {
    throw new OperationError("Email já está em uso", 409)
  }

  return userService.create({ name, email, password, role, status })
}

export async function updateUser(userId: string, input: UserPayload): Promise<void> {
  const { name, email, role, status } = input
  await userService.update(userId, { name, email, role, status })
}

export async function deleteUser(currentUser: PublicUser, userId: string): Promise<void> {
  if (currentUser.id === userId) {
    throw new OperationError("Você não pode excluir sua própria conta")
  }

  await userService.delete(userId)
}
