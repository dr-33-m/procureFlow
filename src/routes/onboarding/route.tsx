import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { currentUserQueryOptions } from '@/lib/query-manager/auth/options'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async ({ context }) => {
    const result = await context.queryClient.ensureQueryData(
      currentUserQueryOptions(),
    )
    if (!result.authenticated) {
      throw redirect({ to: '/auth/sign-in' })
    }
    // Already part of a company — no onboarding needed.
    if (!result.needsOnboarding) {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})
