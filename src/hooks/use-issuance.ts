import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getInventoryForIssuanceOptions,
  getRecentIssuancesOptions,
  getTodayIssuanceStatsOptions,
  getAllIssuancesOptions,
} from '@/lib/query-manager/issuance/options'
import { issuanceKeys } from '@/lib/query-manager/issuance/keys'
import { issueStock } from '@/server/issuance'

export function useInventoryForIssuance() {
  return useQuery(getInventoryForIssuanceOptions())
}

export function useRecentIssuances() {
  return useQuery(getRecentIssuancesOptions())
}

export function useTodayIssuanceStats() {
  return useQuery(getTodayIssuanceStatsOptions())
}

export function useAllIssuances(page: number, pageSize = 20) {
  return useQuery(getAllIssuancesOptions(page, pageSize))
}

export function useIssueStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof issueStock>[0]['data']) => issueStock({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: issuanceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['pantry'] })
      toast.success('Stock deducted successfully')
    },
    onError: () => {
      toast.error('Failed to deduct stock')
    },
  })
}
