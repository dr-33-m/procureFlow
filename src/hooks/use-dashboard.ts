import { useQuery } from '@tanstack/react-query'
import { getDashboardStatsOptions, getRecentActivityOptions } from '@/lib/query-manager/dashboard/options'

export function useDashboardStats() {
  return useQuery(getDashboardStatsOptions())
}

export function useRecentActivity() {
  return useQuery(getRecentActivityOptions())
}
