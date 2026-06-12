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
import { useActiveBranchId } from '@/hooks/use-active-branch'

export function useInventoryForIssuance() {
  const branchId = useActiveBranchId()
  return useQuery(getInventoryForIssuanceOptions(branchId))
}

export function useRecentIssuances() {
  const branchId = useActiveBranchId()
  return useQuery(getRecentIssuancesOptions(branchId))
}

export function useTodayIssuanceStats() {
  const branchId = useActiveBranchId()
  return useQuery(getTodayIssuanceStatsOptions(branchId))
}

export function useAllIssuances(page: number, pageSize = 20) {
  const branchId = useActiveBranchId()
  return useQuery(getAllIssuancesOptions(branchId, page, pageSize))
}

export function useIssueStock() {
  const queryClient = useQueryClient()
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (
      data: Omit<Parameters<typeof issueStock>[0]['data'], 'branchId'>,
    ) => issueStock({ data: { ...data, branchId } }),
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
