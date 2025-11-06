import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Campos obrigatórios: to, subject, html" }, { status: 400 })
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html,
    })

    if (error) {
      console.error("Erro ao enviar email:", error, JSON.stringify(error, null, 2))
      return NextResponse.json({ error: error.message || "Erro ao enviar email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Erro ao enviar email:", error)
    return NextResponse.json({ error: "Erro ao enviar email" }, { status: 500 })
  }
}
