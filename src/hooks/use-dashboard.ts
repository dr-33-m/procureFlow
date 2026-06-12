import { useQuery } from '@tanstack/react-query'
import { getDashboardStatsOptions, getRecentActivityOptions } from '@/lib/query-manager/dashboard/options'
import { useActiveBranchId } from '@/hooks/use-active-branch'

export function useDashboardStats() {
  const branchId = useActiveBranchId()
  return useQuery(getDashboardStatsOptions(branchId))
}

export function useRecentActivity() {
  const branchId = useActiveBranchId()
  return useQuery(getRecentActivityOptions(branchId))
}
