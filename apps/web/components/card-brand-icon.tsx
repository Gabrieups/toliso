import { CreditCard } from "lucide-react"
import { PaymentIcon } from "react-svg-credit-card-payment-icons"

interface CardBrandIconProps {
  brand: "visa" | "mastercard" | "elo" | "american-express"
  className?: string
  /** Largura do logo em pixels. Padrão: 26 (cabe em uma etiqueta). */
  width?: number
}

const TYPE_BY_BRAND = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  "american-express": "Amex",
} as const

export function CardBrandIcon({ brand, className = "h-4 w-4", width = 26 }: CardBrandIconProps) {
  const type = TYPE_BY_BRAND[brand]

  if (!type) {
    return <CreditCard className={className} />
  }

  // `logo` (sem borda) fica mais limpo sobre superfícies translúcidas.
  return <PaymentIcon type={type} format="logo" width={width} />
}
