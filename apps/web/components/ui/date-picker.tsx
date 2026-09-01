"use client"

import * as React from "react"
import { CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatISODate, fromISODate, toISODate, todayISODate } from "@toliso/core"

export interface DatePickerProps {
  /** Data no formato `YYYY-MM-DD`, ou string vazia quando não há data. */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  /** Mostra o botão de limpar quando há data escolhida. */
  clearable?: boolean
  className?: string
  "aria-describedby"?: string
}

/**
 * Seletor de data padrão da plataforma.
 *
 * Substitui o `<input type="date">` nativo, que renderizava com a aparência e o
 * formato do navegador — variando entre `mm/dd/yyyy` e `dd/mm/yyyy` conforme a
 * máquina do usuário. Aqui o formato é sempre `dd/mm/aaaa` e o calendário segue
 * o mesmo vidro do restante da interface, igual ao seletor do aplicativo.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Escolher data",
  disabled = false,
  clearable = false,
  className,
  ...rest
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const selected = fromISODate(value) ?? undefined
  const label = formatISODate(value)

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    onChange(toISODate(date))
    setIsOpen(false)
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={label ? `Data selecionada: ${label}. Alterar` : placeholder}
            className={cn(
              "h-11 w-full justify-start gap-3 rounded-md px-4 font-normal",
              !label && "text-muted-foreground",
              clearable && label && "pr-11",
            )}
            {...rest}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{label || placeholder}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto p-0">
          <Calendar mode="single" selected={selected} onSelect={handleSelect} defaultMonth={selected} initialFocus />

          <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(todayISODate())
                setIsOpen(false)
              }}
            >
              Hoje
            </Button>

            {clearable ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange("")
                  setIsOpen(false)
                }}
                className="text-muted-foreground"
              >
                Limpar
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {clearable && label && !disabled ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar data"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
