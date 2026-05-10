import {
  getShoppingLists,
  getShoppingList,
  getProductCatalog,
  getProductsWithStock,
  getRunners,
} from '@/server/shopping-lists'
import { shoppingListKeys } from './keys'

export function getShoppingListsOptions(branchId: string, filter?: string) {
  return {
    queryKey: shoppingListKeys.lists(branchId, filter),
    queryFn: () => getShoppingLists({ data: branchId }),
    staleTime: 30_000,
    enabled: !!branchId,
  }
}

export function getShoppingListOptions(branchId: string, id: string) {
  return {
    queryKey: shoppingListKeys.detail(branchId, id),
    queryFn: () => getShoppingList({ data: { branchId, id } }),
    staleTime: 30_000,
    enabled: !!branchId && !!id,
  }
}

export function getProductCatalogOptions(branchId: string) {
  return {
    queryKey: shoppingListKeys.catalog(branchId),
    queryFn: () => getProductCatalog({ data: branchId }),
    staleTime: 5 * 60_000,
    enabled: !!branchId,
  }
}

export function getProductsWithStockOptions(branchId: string) {
  return {
    queryKey: shoppingListKeys.catalogWithStock(branchId),
    queryFn: () => getProductsWithStock({ data: branchId }),
    staleTime: 30_000,
    enabled: !!branchId,
  }
}

export function getRunnersOptions(branchId: string) {
  return {
    queryKey: shoppingListKeys.runners(branchId),
    queryFn: () => getRunners({ data: branchId }),
    staleTime: 5 * 60_000,
    enabled: !!branchId,
  }
}
