import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Campos obrigatórios: to, subject, html" }, { status: 400 })
    }

    const result = await sendEmail({ to, subject, html })

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 503 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro ao enviar email:", error)
    return NextResponse.json({ error: "Erro ao enviar email" }, { status: 500 })
  }
}
