import { refreshSession } from "@/app/actions/auth"
import { NextResponse } from "next/server"

// Evita que a resposta seja cacheada, garantindo verificação de sessão sempre fresca
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // refreshSession renova o cookie (sessão deslizante) e retorna o usuário
    const user = await refreshSession()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Erro ao verificar sessão:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
