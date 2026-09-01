import { NextResponse } from "next/server"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

/**
 * O cliente é criado sob demanda, não no carregamento do módulo: o construtor
 * do Resend lança quando a chave não existe, o que quebrava o `next build` em
 * ambientes sem `RESEND_API_KEY` configurada.
 */
function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Campos obrigatórios: to, subject, html" }, { status: 400 })
    }

    const resend = getResend()

    if (!resend) {
      return NextResponse.json({ error: "Envio de e-mail não configurado (RESEND_API_KEY ausente)" }, { status: 503 })
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
