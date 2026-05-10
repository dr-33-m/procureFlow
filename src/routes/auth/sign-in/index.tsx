import { createFileRoute } from '@tanstack/react-router'
import { signIn } from '@/server/auth/functions'

export const Route = createFileRoute('/auth/sign-in/')({
  beforeLoad: async () => {
    await signIn()
  },
  component: () => null,
})
