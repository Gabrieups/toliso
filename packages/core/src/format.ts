/** Formatacao compartilhada entre web e mobile (pt-BR). */

/** `1234.5` -> `1.234,50` (sem simbolo de moeda). */
export function formatAmount(value: number | string | undefined | null): string {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value
  if (numeric === undefined || numeric === null || Number.isNaN(numeric)) {
    return "0,00"
  }
  return numeric.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** `1234.5` -> `R$ 1.234,50`. */
export function formatCurrency(value: number | string | undefined | null): string {
  return `R$ ${formatAmount(value)}`
}

/** Converte texto digitado (`1.234,56` ou `1234.56`) em numero. */
export function parseAmount(value: string): number {
  if (!value) return Number.NaN
  const normalized = value
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
  return Number.parseFloat(normalized)
}

/** `2025-02-14T10:00:00Z` -> `14/02/2025`. */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/** `2025-02-14T10:00:00Z` -> `14/02/2025 07:00`. */
export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Iniciais para avatares: `Gabriel Paixao` -> `GP`. */
export function getInitials(name: string | undefined | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Pluralizacao simples em pt-BR. */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * Remove os sufixos gerados na criacao de transacoes compartilhadas e
 * recorrentes, devolvendo o titulo original informado pelo usuario.
 */
export function getBaseTitle(title: string): string {
  return title
    .replace(/ - Parte .*$/, "")
    .replace(/ - Compartilhado$/, "")
    .replace(/ - [a-z]{3}\.?\/\d{2}$/i, "")
    .trim()
}
