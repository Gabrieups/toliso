/**
 * Datas de calendário (sem hora).
 *
 * Os seletores de data da web e do aplicativo trabalham com a mesma string
 * `YYYY-MM-DD` e exibem tudo como `dd/mm/aaaa`.
 *
 * O ponto delicado é o fuso: `new Date("2025-08-31")` é interpretado como
 * meia-noite **UTC**, o que no Brasil (UTC-3) cai no dia 30. Por isso toda
 * conversão de string para `Date` aqui ancora no **meio-dia local** — assim o
 * dia escolhido continua sendo o dia gravado, em qualquer fuso.
 */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const pad = (value: number) => value.toString().padStart(2, "0")

/** `Date` -> `YYYY-MM-DD`, usando os componentes locais da data. */
export function toISODate(date: Date): string {
  if (Number.isNaN(date.getTime())) return ""
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `YYYY-MM-DD` -> `Date` ao meio-dia local. Devolve `null` se inválida. */
export function fromISODate(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE_PATTERN.test(value)) return null

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)

  // Rejeita datas que "transbordam", como 2025-02-31.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

export function isValidISODate(value: string | null | undefined): boolean {
  return fromISODate(value ?? null) !== null
}

/** `YYYY-MM-DD` -> `dd/mm/aaaa`. String vazia quando não há data. */
export function formatISODate(value: string | null | undefined): string {
  const date = fromISODate(value ?? null)
  if (!date) return ""
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** Data de hoje em `YYYY-MM-DD`. */
export function todayISODate(): string {
  return toISODate(new Date())
}

/**
 * Converte a data escolhida no seletor para o instante que será gravado.
 *
 * Ancora ao meio-dia local para que o dia sobreviva à ida e volta em UTC.
 * Valores que já venham com hora são preservados.
 */
export function toTimestamp(value: string | null | undefined): string | undefined {
  if (!value) return undefined

  const calendarDate = fromISODate(value)
  if (calendarDate) return calendarDate.toISOString()

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

/** Instante gravado -> `YYYY-MM-DD` local, para preencher o seletor. */
export function timestampToISODate(value: string | null | undefined): string {
  if (!value) return ""
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "" : toISODate(parsed)
}

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const

export interface CalendarCell {
  /** `YYYY-MM-DD`, ou `null` nos espaços vazios antes do dia 1. */
  iso: string | null
  day: number | null
}

/**
 * Monta a grade de um mês (semanas começando no domingo), com células vazias
 * no início para alinhar o dia 1 ao dia da semana correto.
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstDay = new Date(year, monthIndex, 1)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const leadingBlanks = firstDay.getDay()

  const cells: CalendarCell[] = []

  for (let index = 0; index < leadingBlanks; index++) {
    cells.push({ iso: null, day: null })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: `${year}-${pad(monthIndex + 1)}-${pad(day)}`, day })
  }

  return cells
}
