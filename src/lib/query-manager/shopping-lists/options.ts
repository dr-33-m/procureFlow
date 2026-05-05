import {
  getShoppingLists,
  getShoppingList,
  getProductCatalog,
  getProductsWithStock,
  getRunners,
} from '@/server/shopping-lists'
import { shoppingListKeys } from './keys'

export function getShoppingListsOptions() {
  return {
    queryKey: shoppingListKeys.lists(),
    queryFn: () => getShoppingLists(),
    staleTime: 30_000,
  }
}

export function getShoppingListOptions(id: string) {
  return {
    queryKey: shoppingListKeys.detail(id),
    queryFn: () => getShoppingList({ data: id }),
    staleTime: 30_000,
    enabled: !!id,
  }
}

export function getProductCatalogOptions() {
  return {
    queryKey: shoppingListKeys.catalog(),
    queryFn: () => getProductCatalog(),
    staleTime: 5 * 60_000,
  }
}

export function getProductsWithStockOptions() {
  return {
    queryKey: shoppingListKeys.catalogWithStock(),
    queryFn: () => getProductsWithStock(),
    staleTime: 30_000,
  }
}

export function getRunnersOptions() {
  return {
    queryKey: shoppingListKeys.runners(),
    queryFn: () => getRunners(),
    staleTime: 5 * 60_000,
  }
}
