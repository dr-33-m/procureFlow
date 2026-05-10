import { createFileRoute } from "@tanstack/react-router"
import { signOut } from "@/server/auth/functions"

export const Route = createFileRoute("/auth/sign-out/")({
  beforeLoad: async () => {
    await signOut()
  },
  component: () => null,
})
