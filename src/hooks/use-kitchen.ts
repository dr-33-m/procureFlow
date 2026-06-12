import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listKitchenStockOptions,
  getReconciliationHistoryOptions,
} from '@/lib/query-manager/kitchen/options'
import { kitchenKeys, type KitchenStockParams } from '@/lib/query-manager/kitchen/keys'
import { recordReconciliation } from '@/server/kitchen'
import { useActiveBranchId } from '@/hooks/use-active-branch'

export function useKitchenStock(
  params: Omit<KitchenStockParams, 'branchId'> = {},
) {
  const branchId = useActiveBranchId()
  return useQuery(listKitchenStockOptions({ ...params, branchId }))
}

export function useReconciliationHistory() {
  const branchId = useActiveBranchId()
  return useQuery(getReconciliationHistoryOptions(branchId))
}

export function useRecordReconciliation() {
  const queryClient = useQueryClient()
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (
      data: Omit<Parameters<typeof recordReconciliation>[0]['data'], 'branchId'>,
    ) => recordReconciliation({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitchenKeys.all })
      queryClient.invalidateQueries({ queryKey: ['issuance'] })
      queryClient.invalidateQueries({ queryKey: ['pantry'] })
      toast.success('Reconciliation recorded — learned rates updated.')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record reconciliation')
    },
  })
}
