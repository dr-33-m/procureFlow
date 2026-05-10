import { getDashboardStats, getRecentListActivity } from '@/server/dashboard'
import { dashboardKeys } from './keys'

export function getDashboardStatsOptions(branchId: string) {
  return {
    queryKey: dashboardKeys.stats(branchId),
    queryFn: () => getDashboardStats({ data: branchId }),
    staleTime: 60_000,
    enabled: !!branchId,
  }
}

export function getRecentActivityOptions(branchId: string) {
  return {
    queryKey: dashboardKeys.activity(branchId),
    queryFn: () => getRecentListActivity({ data: branchId }),
    staleTime: 30_000,
    enabled: !!branchId,
  }
}
