import { createFileRoute, redirect } from '@tanstack/react-router'
import { DashboardPage } from '@/components/features/dashboard/dashboard-page'
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton'
import {
  getDashboardStatsOptions,
  getRecentActivityOptions,
} from '@/lib/query-manager/dashboard/options'

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => {
    const role = context.auth?.userRole
    if (role === 'runner' || role === 'chef') {
      throw redirect({ to: '/shopping-lists', search: { filter: undefined } })
    }
  },
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch } }) => {
    if (!branch) return
    await Promise.all([
      queryClient.ensureQueryData(getDashboardStatsOptions(branch)),
      queryClient.ensureQueryData(getRecentActivityOptions(branch)),
    ])
  },
  component: DashboardPage,
  pendingComponent: DashboardSkeleton,
})
