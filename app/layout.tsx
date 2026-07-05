import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AlertModal } from "@/components/alert-modal"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "To Liso",
  description: "Plataforma de controle de gastos de cartão de crédito",
  generator: "v0.dev",
  icons: {
    icon: "/ToLiso-Logo-Cor.png",
    shortcut: "/favicon.png",
    apple: "/ToLiso-Logo-Cor.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
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
