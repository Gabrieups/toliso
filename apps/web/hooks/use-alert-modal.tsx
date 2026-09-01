"use client"

import { create } from "zustand"

interface AlertModalState {
  isOpen: boolean
  title: string
  message: string
  variant: "info" | "success" | "error" | "warning"
  onConfirm?: () => void
  confirmText?: string
  showCancel?: boolean
  open: (config: {
    title?: string
    message: string
    variant?: "info" | "success" | "error" | "warning"
    onConfirm?: () => void
    confirmText?: string
    showCancel?: boolean
  }) => void
  close: () => void
}

export const useAlertModal = create<AlertModalState>((set) => ({
  isOpen: false,
  title: "",
  message: "",
  variant: "info",
  onConfirm: undefined,
  confirmText: "OK",
  showCancel: false,
  open: (config) =>
    set({
      isOpen: true,
      title:
        config.title || (config.variant === "error" ? "Erro" : config.variant === "success" ? "Sucesso" : "Informação"),
      message: config.message,
      variant: config.variant || "info",
      onConfirm: config.onConfirm,
      confirmText: config.confirmText || "OK",
      showCancel: config.showCancel || false,
    }),
  close: () =>
    set({
      isOpen: false,
      onConfirm: undefined,
    }),
}))
