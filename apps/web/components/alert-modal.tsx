"use client"

import { useAlertModal } from "@/hooks/use-alert-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react"

const VARIANT_STYLES = {
  success: { Icon: CheckCircle2, chip: "bg-primary/12 text-primary", action: "" },
  error: { Icon: AlertCircle, chip: "bg-destructive/12 text-destructive", action: "bg-destructive text-destructive-foreground hover:brightness-110" },
  warning: { Icon: AlertTriangle, chip: "bg-amber-500/15 text-amber-500", action: "" },
  info: { Icon: Info, chip: "bg-sky-500/15 text-sky-500", action: "" },
} as const

/**
 * Diálogo global de aviso e confirmação.
 *
 * O ícone em destaque no topo dá o tom da mensagem antes mesmo da leitura —
 * é o mesmo padrão usado no aplicativo mobile.
 */
export function AlertModal() {
  const { isOpen, title, message, variant, onConfirm, confirmText, showCancel, close } = useAlertModal()

  const { Icon, chip, action } = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info

  const handleConfirm = () => {
    onConfirm?.()
    close()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={close}>
      <AlertDialogContent className="w-[95vw] max-w-md">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <span className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full ${chip}`}>
            <Icon className="h-6 w-6" />
          </span>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">{message}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          {showCancel ? <AlertDialogCancel className="w-full sm:flex-1">Cancelar</AlertDialogCancel> : null}
          <AlertDialogAction onClick={handleConfirm} className={`w-full sm:flex-1 ${action}`}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
