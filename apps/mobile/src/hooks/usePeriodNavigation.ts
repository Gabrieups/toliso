import { useCallback, useMemo, useState } from "react"
import { collectPeriods, getCurrentPeriod, getPeriodDisplay } from "@toliso/core"

/**
 * Navegação entre períodos de fatura.
 *
 * Diferente da web — que guarda a string especial `"current"` — aqui o estado é
 * sempre uma chave `YYYY-MM` concreta. Isso elimina uma classe inteira de bugs
 * de comparação (`"current"` nunca bate com um período de verdade) e deixa a
 * navegação previsível.
 */
export function usePeriodNavigation(items: Array<{ date: string }>) {
  const [selected, setSelected] = useState<string>(() => getCurrentPeriod())

  const periods = useMemo(() => collectPeriods(items), [items])

  // Garante que o período escolhido apareça na lista mesmo sem movimentações.
  const allPeriods = useMemo(() => {
    if (periods.includes(selected)) return periods
    return [...periods, selected].sort().reverse()
  }, [periods, selected])

  const index = allPeriods.indexOf(selected)

  const goToOlder = useCallback(() => {
    if (index < allPeriods.length - 1) setSelected(allPeriods[index + 1])
  }, [index, allPeriods])

  const goToNewer = useCallback(() => {
    if (index > 0) setSelected(allPeriods[index - 1])
  }, [index, allPeriods])

  return {
    selected,
    setSelected,
    periods: allPeriods,
    display: getPeriodDisplay(selected),
    /** Rótulo curto para cabeçalhos, ex.: `FEV/2025`. */
    shortDisplay: getPeriodDisplay(selected, { includeRange: false }),
    goToOlder,
    goToNewer,
    hasOlder: index < allPeriods.length - 1,
    hasNewer: index > 0,
    isCurrent: selected === getCurrentPeriod(),
  }
}
