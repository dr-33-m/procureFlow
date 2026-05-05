import { getDashboardStats, getRecentListActivity } from '@/server/dashboard'
import { dashboardKeys } from './keys'

export function getDashboardStatsOptions() {
  return {
    queryKey: dashboardKeys.stats(),
    queryFn: () => getDashboardStats(),
    staleTime: 60_000,
  }
}

export function getRecentActivityOptions() {
  return {
    queryKey: dashboardKeys.activity(),
    queryFn: () => getRecentListActivity(),
    staleTime: 30_000,
  }
}
