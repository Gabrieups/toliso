import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AlertModal } from "@/components/alert-modal"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "To Liso",
  description: "Plataforma de controle de gastos de cartão de crédito",
  icons: {
    icon: "/ToLiso-Logo-Cor.png",
    apple: "/ToLiso-Logo-Cor.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    // Acompanham o gradiente de fundo definido em globals.css.
    { media: "(prefers-color-scheme: light)", color: "#f7fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#05070d" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <AlertModal />
      </body>
    </html>
  )
}
