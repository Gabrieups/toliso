export interface Transaction {
  id: string
  title: string
  description: string
  amount: number
  originalAmount?: number
  cardName: string
  date: string
  userId: string
  userName: string
  userEmail: string
  isInstallment?: boolean
  totalInstallments?: number
  currentInstallment?: number
  isShared?: boolean
  sharedWith?: string[]
  sharedUserNames?: string[]
  installmentGroup?: string
}
