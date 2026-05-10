import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/members/')({
  beforeLoad: async () => {
    throw redirect({ to: '/settings/company', search: { tab: 'members' } })
  },
  component: () => null,
})
