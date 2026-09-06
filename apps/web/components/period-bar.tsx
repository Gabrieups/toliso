"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { MONTH_NAMES_SHORT, getCurrentPeriod, getPeriodDisplay, getYearFromPeriod } from "@toliso/core"

interface PeriodBarProps {
  /** Períodos com movimentação, em ordem decrescente. */
  periods: string[]
  selected: string
  onSelect: (period: string) => void
}

/**
 * Navegação entre períodos de fatura.
 *
 * As setas andam um mês por vez; o botão central abre a grade do ano. Os meses
 * sem movimentação continuam clicáveis, só que apagados — o histórico inteiro
 * fica visível em vez de o usuário ter que adivinhar o que existe.
 */
export function PeriodBar({ periods, selected, onSelect }: PeriodBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(() => getYearFromPeriod(selected))

  const allPeriods = useMemo(() => {
    const merged = new Set([...periods, selected, getCurrentPeriod()])
    return Array.from(merged).sort().reverse()
  }, [periods, selected])

  const index = allPeriods.indexOf(selected)
  const hasOlder = index < allPeriods.length - 1
  const hasNewer = index > 0

  const years = useMemo(() => {
    const set = new Set(allPeriods.map(getYearFromPeriod))
    return Array.from(set).sort()
  }, [allPeriods])

  const minYear = years[0] ?? displayYear
  const maxYear = years[years.length - 1] ?? displayYear

  const handleOpenChange = (open: boolean) => {
    if (open) setDisplayYear(getYearFromPeriod(selected))
    setIsOpen(open)
  }

  return (
    <div className="glass glass-soft glass-flat flex items-center gap-1 rounded-full p-1.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => hasOlder && onSelect(allPeriods[index + 1])}
        disabled={!hasOlder}
        aria-label="Período anterior"
        className="h-9 w-9 shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-9 min-w-0 flex-1 gap-2 px-2 text-xs sm:text-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{getPeriodDisplay(selected)}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="center" className="w-[min(20rem,90vw)] p-4">
          <div className="mb-4 flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisplayYear((year) => year - 1)}
              disabled={displayYear <= minYear}
              aria-label="Ano anterior"
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4rem] text-center text-lg font-semibold">{displayYear}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisplayYear((year) => year + 1)}
              disabled={displayYear >= maxYear}
              aria-label="Próximo ano"
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES_SHORT.map((month, monthIndex) => {
              const period = `${displayYear}-${String(monthIndex + 1).padStart(2, "0")}`
              const isSelected = period === selected
              const hasData = allPeriods.includes(period)
              const isCurrent = period === getCurrentPeriod()

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    onSelect(period)
                    setIsOpen(false)
                  }}
                  aria-current={isSelected ? "date" : undefined}
                  className={[
                    "relative rounded-md py-2.5 text-xs font-semibold transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : hasData
                        ? "text-foreground hover:bg-foreground/5"
                        : "text-muted-foreground/50 hover:bg-foreground/5",
                    isCurrent && !isSelected ? "ring-1 ring-primary/50" : "",
                  ].join(" ")}
                >
                  {month}
                  {hasData && !isSelected ? (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => hasNewer && onSelect(allPeriods[index - 1])}
        disabled={!hasNewer}
        aria-label="Próximo período"
        className="h-9 w-9 shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
