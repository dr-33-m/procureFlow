import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/components/features/dashboard/dashboard-page'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})
