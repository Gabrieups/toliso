/**
 * Logica de periodo de fatura.
 *
 * O ciclo padrao da plataforma vai do dia de fechamento do cartao (16 por
 * padrao) ate o dia anterior ao fechamento do mes seguinte. Ex.: 16/01 a 15/02
 * pertencem ao periodo "2025-02".
 *
 * Esta e a UNICA fonte de verdade deste calculo. Web e mobile importam daqui
 * para que os dois clientes sempre agrupem os lancamentos do mesmo jeito.
 */

export const MONTH_NAMES_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const

export const MONTH_NAMES_SHORT = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
] as const

export interface PeriodInfo {
  /** Chave ordenavel do periodo, no formato `YYYY-MM`. */
  period: string
  /** Rotulo legivel, ex.: `FEV/2025 (16/01 - 15/02)`. */
  periodDisplay: string
}

export interface PeriodOptions {
  /** Dia de fechamento do cartao. Padrao: 16. */
  closingDate?: number
  /** Formato do nome do mes no rotulo. Padrao: `short`. */
  monthFormat?: "short" | "long"
  /** Fuso usado para ler a data. Padrao: `local`. */
  timezone?: "local" | "utc"
  /** Inclui o intervalo de dias no rotulo. Padrao: `true`. */
  includeRange?: boolean
}

const pad = (value: number) => value.toString().padStart(2, "0")

/**
 * Retorna a que periodo de fatura uma data pertence.
 *
 * Datas a partir do dia de fechamento caem no periodo do mes seguinte; datas
 * anteriores caem no periodo do proprio mes.
 */
export function getInvoicePeriod(date: Date, options: PeriodOptions = {}): PeriodInfo {
  const { closingDate = 16, monthFormat = "short", timezone = "local", includeRange = true } = options

  const monthNames = monthFormat === "long" ? MONTH_NAMES_LONG : MONTH_NAMES_SHORT

  const year = timezone === "utc" ? date.getUTCFullYear() : date.getFullYear()
  const month = (timezone === "utc" ? date.getUTCMonth() : date.getMonth()) + 1
  const day = timezone === "utc" ? date.getUTCDate() : date.getDate()

  if (day >= closingDate) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const period = `${nextYear}-${pad(nextMonth)}`

    const range = `(${pad(closingDate)}/${pad(month)} - ${pad(closingDate - 1)}/${pad(nextMonth)})`
    const periodDisplay = includeRange
      ? `${monthNames[nextMonth - 1]}/${nextYear} ${range}`
      : `${monthNames[nextMonth - 1]}/${nextYear}`

    return { period, periodDisplay }
  }

  const period = `${year}-${pad(month)}`
  const prevMonth = month === 1 ? 12 : month - 1
  const range = `(${pad(closingDate)}/${pad(prevMonth)} - ${pad(closingDate - 1)}/${pad(month)})`
  const periodDisplay = includeRange
    ? `${monthNames[month - 1]}/${year} ${range}`
    : `${monthNames[month - 1]}/${year}`

  return { period, periodDisplay }
}

/** Periodo de fatura vigente hoje. */
export function getCurrentPeriod(options: PeriodOptions = {}): string {
  return getInvoicePeriod(new Date(), options).period
}

/** Rotulo do periodo vigente hoje. */
export function getCurrentPeriodDisplay(options: PeriodOptions = {}): string {
  return getInvoicePeriod(new Date(), options).periodDisplay
}

/** Constroi o rotulo de um periodo a partir da sua chave `YYYY-MM`. */
export function getPeriodDisplay(period: string, options: PeriodOptions = {}): string {
  const { closingDate = 16, monthFormat = "short", includeRange = true } = options
  const monthNames = monthFormat === "long" ? MONTH_NAMES_LONG : MONTH_NAMES_SHORT

  const [yearStr, monthStr] = period.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!year || !month || month < 1 || month > 12) return period

  const prevMonth = month === 1 ? 12 : month - 1
  const range = `(${pad(closingDate)}/${pad(prevMonth)} - ${pad(closingDate - 1)}/${pad(month)})`

  return includeRange ? `${monthNames[month - 1]}/${year} ${range}` : `${monthNames[month - 1]}/${year}`
}

/** Extrai o ano de uma chave `YYYY-MM`. */
export function getYearFromPeriod(period: string): number {
  return Number.parseInt(period.split("-")[0], 10)
}

/** Extrai o mes (0-11) de uma chave `YYYY-MM`. */
export function getMonthIndexFromPeriod(period: string): number {
  return Number.parseInt(period.split("-")[1], 10) - 1
}

/** Avanca (ou retrocede) `offset` meses a partir de uma chave `YYYY-MM`. */
export function shiftPeriod(period: string, offset: number): string {
  const year = getYearFromPeriod(period)
  const monthIndex = getMonthIndexFromPeriod(period)
  const date = new Date(Date.UTC(year, monthIndex + offset, 1))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

/**
 * Lista, em ordem decrescente, todos os periodos presentes nos lancamentos
 * informados. O periodo vigente e sempre incluido para que o usuario consiga
 * navegar ate o mes atual mesmo sem movimentacoes.
 */
export function collectPeriods(
  items: Array<{ date: string }>,
  options: PeriodOptions = {},
  { includeCurrent = true }: { includeCurrent?: boolean } = {},
): string[] {
  const periods = new Set<string>()

  for (const item of items) {
    periods.add(getInvoicePeriod(new Date(item.date), options).period)
  }

  if (includeCurrent) periods.add(getCurrentPeriod(options))

  return Array.from(periods).sort().reverse()
}

/** Verifica se uma data cai dentro do periodo informado. */
export function isInPeriod(date: string | Date, period: string, options: PeriodOptions = {}): boolean {
  const parsed = typeof date === "string" ? new Date(date) : date
  return getInvoicePeriod(parsed, options).period === period
}

/**
 * Data de vencimento real de uma fatura: o dia `dueDate` dentro do mes do
 * periodo. Usada para agendar os lembretes de notificacao no mobile.
 */
export function getInvoiceDueDate(period: string, dueDate: number): Date {
  const year = getYearFromPeriod(period)
  const monthIndex = getMonthIndexFromPeriod(period)
  // Dia 0 do mes seguinte = ultimo dia do mes atual, evita estourar em meses curtos.
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, Math.min(dueDate, lastDayOfMonth), 12, 0, 0, 0)
}

/** Data de fechamento real de uma fatura (dia `closingDate` do mes anterior). */
export function getInvoiceClosingDate(period: string, closingDate: number): Date {
  const year = getYearFromPeriod(period)
  const monthIndex = getMonthIndexFromPeriod(period)
  const targetMonth = monthIndex - 1
  const lastDayOfMonth = new Date(year, targetMonth + 1, 0).getDate()
  return new Date(year, targetMonth, Math.min(closingDate, lastDayOfMonth), 12, 0, 0, 0)
}
