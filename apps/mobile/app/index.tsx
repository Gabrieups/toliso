import { Redirect } from "expo-router"
import React from "react"
import { useAuth } from "@/state/auth"

/** Porta de entrada: manda para as abas ou para o login. */
export default function Index() {
  const { isAuthenticated } = useAuth()

  return <Redirect href={isAuthenticated ? "/(tabs)/home" : "/login"} />
}
