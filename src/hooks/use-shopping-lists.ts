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
import type { RestockSuggestion } from '@/types'

export function useShoppingLists() {
  return useQuery(getShoppingListsOptions())
}

export function useShoppingList(id: string) {
  return useQuery(getShoppingListOptions(id))
}

export function useProductCatalog() {
  return useQuery(getProductCatalogOptions())
}

export function useProductsWithStock() {
  return useQuery(getProductsWithStockOptions())
}

export function useRunners() {
  return useQuery(getRunnersOptions())
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof createShoppingList>[0]['data']) =>
      createShoppingList({ data }),
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

  return useMutation({
    mutationFn: (data: { id: string; status: string }) =>
      updateShoppingListStatus({ data }),
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

  return useMutation({
    mutationFn: (data: Parameters<typeof updateShoppingListItem>[0]['data']) =>
      updateShoppingListItem({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.detail(listId) })
      toast.success('Item updated')
    },
    onError: () => {
      toast.error('Failed to update item')
    },
  })
}

export function useUpdateShoppingList(listId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof updateShoppingList>[0]['data']) =>
      updateShoppingList({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.all })
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.detail(listId) })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: () => {
      toast.error('Failed to update shopping list')
    },
  })
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteShoppingList({ data: id }),
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
  return useMutation<
    RestockSuggestion[],
    Error,
    Parameters<typeof getRestockSuggestions>[0]['data']
  >({
    mutationFn: (data) => getRestockSuggestions({ data }),
  })
}

export function useGenerateDraftFromDefaults() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name?: string) => generateDraftFromDefaults({ data: name }),
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

  return useMutation({
    mutationFn: (data: { productId: string; barcode: string }) =>
      setProductBarcode({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKeys.detail(listId) })
      toast.success('Barcode registered')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to save barcode'
      toast.error(msg)
    },
  })
}
