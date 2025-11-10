"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface PeriodCalendarProps {
  isOpen: boolean
  onClose: () => void
  periods: string[]
  selectedPeriod: string
  onPeriodSelect: (period: string) => void
  getCurrentPeriod: () => string
  getInvoicePeriod: (date: Date) => { period: string; periodDisplay: string }
}

export function PeriodCalendar({
  isOpen,
  onClose,
  periods,
  selectedPeriod,
  onPeriodSelect,
  getCurrentPeriod,
  getInvoicePeriod,
}: PeriodCalendarProps) {
  const getYearFromPeriod = (period: string) => {
    return Number.parseInt(period.split("-")[0])
  }

  const getMonthFromPeriod = (period: string) => {
    return Number.parseInt(period.split("-")[1]) - 1
  }

  const currentSelectedYear =
    selectedPeriod === "current" ? getYearFromPeriod(getCurrentPeriod()) : getYearFromPeriod(selectedPeriod)

  const [displayYear, setDisplayYear] = useState(currentSelectedYear)

  const monthNames = ["JAN.", "FEV.", "MAR.", "ABR.", "MAI.", "JUN.", "JUL.", "AGO.", "SET.", "OUT.", "NOV.", "DEZ."]

  const handleMonthClick = (monthIndex: number) => {
    const period = `${displayYear}-${(monthIndex + 1).toString().padStart(2, "0")}`
    if (periods.includes(period)) {
      onPeriodSelect(period)
      onClose()
    } else if (period === getCurrentPeriod()) {
      onPeriodSelect("current")
      onClose()
    }
  }

  const handlePreviousYear = () => {
    setDisplayYear(displayYear - 1)
  }

  const handleNextYear = () => {
    setDisplayYear(displayYear + 1)
  }

  const getMonthState = (monthIndex: number) => {
    const period = `${displayYear}-${(monthIndex + 1).toString().padStart(2, "0")}`
    const currentPeriod = getCurrentPeriod()
    const isCurrentPeriod = period === currentPeriod
    const hasPeriod = periods.includes(period) || isCurrentPeriod
    const isSelected = (selectedPeriod === "current" && period === currentPeriod) || selectedPeriod === period

    return { hasPeriod, isSelected, isCurrentPeriod }
  }

  const hasPeriodsInYear = (year: number) => {
    return periods.some((p) => getYearFromPeriod(p) === year)
  }

  const minYear = Math.min(...periods.map((p) => getYearFromPeriod(p)))
  const maxYear = Math.max(...periods.map((p) => getYearFromPeriod(p)), getYearFromPeriod(getCurrentPeriod()))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Year navigation */}
          <div className="flex items-center justify-center gap-4 mb-6 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousYear}
              disabled={displayYear <= minYear}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-xl font-semibold min-w-[80px] text-center">{displayYear}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextYear}
              disabled={displayYear >= maxYear}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-3">
            {monthNames.map((month, index) => {
              const { hasPeriod, isSelected } = getMonthState(index)

              return (
                <button
                  key={month}
                  onClick={() => handleMonthClick(index)}
                  disabled={!hasPeriod}
                  className={`
                    py-3 px-2 rounded-lg text-sm font-medium transition-all
                    ${
                      isSelected
                        ? "bg-custom-primary text-white"
                        : hasPeriod
                          ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          : "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                    }
                  `}
                >
                  {month}
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
