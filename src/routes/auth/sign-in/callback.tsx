import { createFileRoute } from '@tanstack/react-router'
import { handleCallback } from '@/server/auth/functions'

export const Route = createFileRoute('/auth/sign-in/callback')({
  beforeLoad: async () => {
    await handleCallback()
  },
  component: () => null,
})
