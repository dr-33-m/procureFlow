import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { getDashboardStatsOptions, getRecentActivityOptions } from '@/lib/query-manager/dashboard/options'
import { DashboardPage } from '@/components/features/dashboard/dashboard-page'

export const Route = createFileRoute('/')({
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(getDashboardStatsOptions()),
      queryClient.ensureQueryData(getRecentActivityOptions()),
    ]),
  component: DashboardPage,
})
