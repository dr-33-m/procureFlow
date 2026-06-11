import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUser } from '@/server/auth/functions'
import { LoginPage } from '@/components/features/auth/login-page'

export const Route = createFileRoute('/auth/sign-in/')({
  beforeLoad: async () => {
    const result = await getSessionUser()
    if (result.authenticated && !result.needsOnboarding) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})
