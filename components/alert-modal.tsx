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
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

export function AlertModal() {
  const { isOpen, title, message, variant, onConfirm, confirmText, showCancel, close } = useAlertModal()

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    close()
  }

  const getIcon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getButtonClass = () => {
    switch (variant) {
      case "success":
        return "bg-green-600 hover:bg-green-700"
      case "error":
        return "bg-red-600 hover:bg-red-700"
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700"
      default:
        return "bg-blue-600 hover:bg-blue-700"
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={close}>
      <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {showCancel && <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>}
          <AlertDialogAction onClick={handleConfirm} className={`${getButtonClass()} text-white w-full sm:w-auto`}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
