import { CreditCard } from "lucide-react"
import { PaymentIcon } from 'react-svg-credit-card-payment-icons';

interface CardBrandIconProps {
  brand: "visa" | "mastercard" | "elo" | "american-express"
  className?: string
}

export function CardBrandIcon({ brand, className = "h-5 w-5" }: CardBrandIconProps) {
  switch (brand) {
    case "visa":
      return (
        <PaymentIcon type="Visa" format="logoBorder" width={30} />
      );
    case "mastercard":
      return (
        <PaymentIcon type="Mastercard" format="logo" width={30} />
      );
    case "elo":
      return (
        <PaymentIcon type="Elo" format="logoBorder" width={30} />
      );
    case "american-express":
      return (
        <PaymentIcon type="Amex" format="logoBorder" width={30} />
      );
    default:
      return <CreditCard className={className} />
  }
}
