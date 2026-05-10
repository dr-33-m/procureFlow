import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getShoppingListsOptions,
  getShoppingListOptions,
  getProductCatalogOptions,
  getProductsWithStockOptions,
  getRunnersOptions,
} from '@/lib/query-manager/shopping-lists/options'
import { shoppingListKeys } from '@/lib/query-manager/shopping-lists/keys'
import { dashboardKeys } from '@/lib/query-manager/dashboard/keys'
import {
  createShoppingList,
  updateShoppingListStatus,
  updateShoppingListItem,
  updateShoppingList,
  deleteShoppingList,
  getRestockSuggestions,
  generateDraftFromDefaults,
  setProductBarcode,
} from '@/server/shopping-lists'
import { useBranchContext } from '@/stores/branch-context'
import type { RestockSuggestion } from '@/types'

export function useShoppingLists() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getShoppingListsOptions(branchId))
}

export function useShoppingList(id: string) {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getShoppingListOptions(branchId, id))
}

export function useProductCatalog() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getProductCatalogOptions(branchId))
}

export function useProductsWithStock() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getProductsWithStockOptions(branchId))
}

export function useRunners() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getRunnersOptions(branchId))
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (
      data: Omit<Parameters<typeof createShoppingList>[0]['data'], 'branchId'>,
    ) => createShoppingList({ data: { ...data, branchId } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all })
      toast.success(variables.status === 'draft' ? 'Draft saved' : 'Shopping list created')
    },
    onError: () => {
      toast.error('Failed to create shopping list')
    },
  })
}

export function useUpdateShoppingListStatus() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      updateShoppingListStatus({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      toast.success('Status updated')
    },
    onError: () => {
      toast.error('Failed to update status')
    },
  })
}

export function useUpdateShoppingListItem(listId: string) {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (data: Parameters<typeof updateShoppingListItem>[0]['data']) =>
      updateShoppingListItem({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.detail(branchId, listId),
      })
      toast.success('Item updated')
    },
    onError: () => {
      toast.error('Failed to update item')
    },
  })
}

export function useUpdateShoppingList(listId: string) {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (
      data: Omit<Parameters<typeof updateShoppingList>[0]['data'], 'branchId'>,
    ) => updateShoppingList({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all })
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.detail(branchId, listId),
      })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: () => {
      toast.error('Failed to update shopping list')
    },
  })
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (id: string) => deleteShoppingList({ data: { id, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      toast.success('Draft deleted')
    },
    onError: () => {
      toast.error('Failed to delete draft')
    },
  })
}

export function useRestockSuggestions() {
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation<
    RestockSuggestion[],
    Error,
    Omit<Parameters<typeof getRestockSuggestions>[0]['data'], 'branchId'>
  >({
    mutationFn: (data) => getRestockSuggestions({ data: { ...data, branchId } }),
  })
}

export function useGenerateDraftFromDefaults() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (name?: string) => generateDraftFromDefaults({ data: { branchId, name } }),
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      if (list) toast.success('Draft shopping list created')
      else toast.info('All items are well-stocked — no suggestions generated')
    },
    onError: () => {
      toast.error('Failed to generate shopping list')
    },
  })
}

export function useSetProductBarcode(listId: string) {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (data: { productId: string; barcode: string }) =>
      setProductBarcode({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.detail(branchId, listId),
      })
      toast.success('Barcode registered')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to save barcode'
      toast.error(msg)
    },
  })
}
