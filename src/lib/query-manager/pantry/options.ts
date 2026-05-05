import {
  getPantryStats,
  getInventoryItems,
  getCategories,
  getProductCatalog,
} from '@/server/pantry'
import { pantryKeys, type PantryItemsParams } from './keys'

export function getPantryStatsOptions() {
  return {
    queryKey: pantryKeys.stats(),
    queryFn: () => getPantryStats(),
    staleTime: 30_000,
  }
}

export function getInventoryItemsOptions(params: PantryItemsParams) {
  return {
    queryKey: pantryKeys.items(params),
    queryFn: () => getInventoryItems({ data: params }),
    staleTime: 30_000,
  }
}

export function getCategoriesOptions() {
  return {
    queryKey: pantryKeys.categories(),
    queryFn: () => getCategories(),
    staleTime: 5 * 60_000,
  }
}

export function getPantryCatalogOptions() {
  return {
    queryKey: [...pantryKeys.all, 'catalog'] as const,
    queryFn: () => getProductCatalog(),
    staleTime: 5 * 60_000,
  }
}
