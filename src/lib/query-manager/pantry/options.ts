import {
  getPantryStats,
  getInventoryItems,
  getCategories,
  getProductCatalog,
} from '@/server/pantry'
import { pantryKeys, type PantryItemsParams } from './keys'

export function getPantryStatsOptions(branchId: string) {
  return {
    queryKey: pantryKeys.stats(branchId),
    queryFn: () => getPantryStats({ data: branchId }),
    staleTime: 30_000,
    enabled: !!branchId,
  }
}

export function getInventoryItemsOptions(params: PantryItemsParams) {
  return {
    queryKey: pantryKeys.items(params),
    queryFn: () => getInventoryItems({ data: params }),
    staleTime: 30_000,
    enabled: !!params.branchId,
  }
}

export function getCategoriesOptions(branchId: string) {
  return {
    queryKey: pantryKeys.categories(branchId),
    queryFn: () => getCategories({ data: branchId }),
    staleTime: 5 * 60_000,
    enabled: !!branchId,
  }
}

export function getPantryCatalogOptions(branchId: string) {
  return {
    queryKey: pantryKeys.catalog(branchId),
    queryFn: () => getProductCatalog({ data: branchId }),
    staleTime: 5 * 60_000,
    enabled: !!branchId,
  }
}
