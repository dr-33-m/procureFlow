import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPantryStatsOptions,
  getInventoryItemsOptions,
  getCategoriesOptions,
  getPantryCatalogOptions,
} from '@/lib/query-manager/pantry/options'
import { pantryKeys, type PantryItemsParams } from '@/lib/query-manager/pantry/keys'
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  createProduct,
  importInventoryFromCSV,
  createProductSupplier,
  deleteProductSupplier,
} from '@/server/pantry'
import { useBranchContext } from '@/stores/branch-context'

export function usePantryStats() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getPantryStatsOptions(branchId))
}

export function useInventoryItems(params: Omit<PantryItemsParams, 'branchId'>) {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getInventoryItemsOptions({ ...params, branchId }))
}

export function useCategories() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getCategoriesOptions(branchId))
}

export function usePantryCatalog() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery(getPantryCatalogOptions(branchId))
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (data: { productId: string; quantity: number; quantityUnit?: 'stock' | 'purchase' }) =>
      addInventoryItem({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success('Item added to inventory')
    },
    onError: () => {
      toast.error('Failed to add item')
    },
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (data: {
      inventoryId: string
      quantity: number
      parPerGuest?: number | null
      parPerGuestUnit?: 'stock' | 'base' | 'serving'
      purchasePrice?: number | null
      servingUnit?: string | null
      servingSize?: number | null
      barcode?: string | null
    }) => updateInventoryItem({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success('Item updated')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update item'
      toast.error(msg)
    },
  })
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (inventoryId: string) => deleteInventoryItem({ data: { inventoryId, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success('Item deleted')
    },
    onError: () => {
      toast.error('Failed to delete item')
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (
      data: Omit<Parameters<typeof createProduct>[0]['data'], 'branchId'>,
    ) => createProduct({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success('Product created and added to inventory')
    },
    onError: () => {
      toast.error('Failed to create product')
    },
  })
}

export function useCreateProductSupplier(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; pricePerUnit?: number | null; priceUnit?: 'purchase' | 'stock' | 'base' }) =>
      createProductSupplier({ data: { productId, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success('Supplier added')
    },
    onError: () => {
      toast.error('Failed to add supplier')
    },
  })
}

export function useDeleteProductSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteProductSupplier({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success('Supplier removed')
    },
    onError: () => {
      toast.error('Failed to remove supplier')
    },
  })
}

export function useImportInventoryFromCSV() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (rows: Omit<Parameters<typeof importInventoryFromCSV>[0]['data'], 'branchId'>) =>
      importInventoryFromCSV({ data: { ...rows, branchId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success(`${result.imported} items imported successfully`)
    },
    onError: () => {
      toast.error('Failed to import inventory')
    },
  })
}
