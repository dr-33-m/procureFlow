import { useQuery } from '@tanstack/react-query'
import { getDashboardStatsOptions, getRecentActivityOptions } from '@/lib/query-manager/dashboard/options'
import { useBranchContext } from '@/stores/branch-context'

export function useDashboardStats() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getDashboardStatsOptions(branchId))
}

export function useRecentActivity() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getRecentActivityOptions(branchId))
}
