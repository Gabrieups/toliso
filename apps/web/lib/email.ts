import { Resend } from "resend"

/**
 * Envio de e-mail via Resend.
 *
 * O cliente é criado sob demanda, não no carregamento do módulo: o construtor
 * do Resend lança quando a chave não existe, o que quebrava o `next build` em
 * ambientes sem `RESEND_API_KEY` configurada.
 */
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ success: true } | { error: string }> {
  const resend = getResend()

  if (!resend) {
    return { error: "Envio de e-mail não configurado (RESEND_API_KEY ausente)." }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject,
    html,
  })

  if (error) {
    console.error("Erro ao enviar email:", error)
    return { error: error.message || "Erro ao enviar email" }
  }

  return { success: true }
}
