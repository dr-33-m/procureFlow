import { createFileRoute, redirect } from '@tanstack/react-router'
import { DashboardPage } from '@/components/features/dashboard/dashboard-page'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    const role = context.auth?.userRole
    if (role === 'runner' || role === 'chef') {
      throw redirect({ to: '/shopping-lists', search: { filter: undefined } })
    }
  },
  component: DashboardPage,
})
