import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getReceivingListsOptions,
  getReceivingListOptions,
} from '@/lib/query-manager/receiving/options'
import { receivingKeys } from '@/lib/query-manager/receiving/keys'
import { scanItem, updateReceivedQuantity, approveItem, approveList } from '@/server/receiving'
import { useBranchContext } from '@/stores/branch-context'

export function useReceivingLists() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getReceivingListsOptions(branchId))
}

export function useReceivingList(id: string) {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getReceivingListOptions(branchId, id))
}

export function useScanItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { listId: string; barcode: string; increment: number }) =>
      scanItem({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: receivingKeys.all })
      if (result.success) {
        toast.success(`Scanned: ${result.productName} → ${result.newQuantity}`)
      } else {
        toast.error(result.error ?? 'Scan failed')
      }
    },
    onError: () => {
      toast.error('Failed to process scan')
    },
  })
}

export function useUpdateReceivedQuantity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { itemId: string; receivedQuantity: number }) =>
      updateReceivedQuantity({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivingKeys.all })
    },
    onError: () => {
      toast.error('Failed to save quantity')
    },
  })
}

export function useApproveItem() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (itemId: string) => approveItem({ data: { itemId, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivingKeys.all })
      toast.success('Item added to pantry')
    },
    onError: () => {
      toast.error('Failed to add item to pantry')
    },
  })
}

export function useApproveList() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (listId: string) => approveList({ data: { listId, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivingKeys.all })
      toast.success('All items approved — added to pantry')
    },
    onError: () => {
      toast.error('Failed to approve list')
    },
  })
}
