import type { LucideIcon } from "lucide-react"
import { formatCurrency } from "@toliso/core"

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  tone?: "positive" | "negative" | "neutral"
  /** Prefixo do valor, ex.: `+` em pagamentos. */
  sign?: "+" | "-" | ""
  caption?: string
}

const TONE_CLASSES = {
  positive: { text: "text-primary", chip: "bg-primary/12 text-primary" },
  negative: { text: "text-destructive", chip: "bg-destructive/12 text-destructive" },
  neutral: { text: "text-foreground", chip: "bg-foreground/8 text-muted-foreground" },
} as const

/**
 * Bloco de destaque numérico.
 *
 * O rótulo vem em maiúsculas e pequeno, o valor domina o cartão e a legenda
 * explica o recorte — a leitura acontece na ordem certa mesmo de relance.
 */
export function StatCard({ label, value, icon: Icon, tone = "neutral", sign = "", caption }: StatCardProps) {
  const classes = TONE_CLASSES[tone]

  return (
    <div className="glass animate-fade-in-up rounded-lg p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${classes.chip}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      <p className={`tabular mt-2 truncate text-2xl font-bold tracking-tight sm:text-[28px] ${classes.text}`}>
        {sign}
        {formatCurrency(value)}
      </p>

      {caption ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{caption}</p> : null}
    </div>
  )
}
