import { createFileRoute, redirect } from "@tanstack/react-router"
import { clearSessionCookies } from "@/server/auth/functions"

export const Route = createFileRoute("/auth/sign-out/callback")({
  beforeLoad: async () => {
    await clearSessionCookies()
    throw redirect({ to: "/auth/sign-in" })
  },
  component: () => null,
})
