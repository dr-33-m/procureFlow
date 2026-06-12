export type PantryItemsParams = {
  branchId: string
  page: number
  pageSize: number
  category: string
  sortBy: string
  q?: string
}

export const PANTRY_PAGE_SIZE = 10

/**
 * Single source of truth for the items query params. The route loader and
 * InventoryTable must build byte-identical params or their query keys won't
 * match and the loader prefetch is wasted.
 */
export function normalizePantryItemsParams(search: {
  page?: number
  category?: string
  sortBy?: string
  q?: string
}): Omit<PantryItemsParams, 'branchId'> {
  return {
    page: search.page ?? 1,
    pageSize: PANTRY_PAGE_SIZE,
    category: search.category ?? 'all',
    sortBy: search.sortBy ?? 'name',
    q: search.q ?? '',
  }
}

export const pantryKeys = {
  all: ['pantry'] as const,
  stats: (branchId: string) => [...pantryKeys.all, 'stats', branchId] as const,
  items: (params: PantryItemsParams) => [...pantryKeys.all, 'items', params] as const,
  categories: (branchId: string) => [...pantryKeys.all, 'categories', branchId] as const,
  catalog: (branchId: string) => [...pantryKeys.all, 'catalog', branchId] as const,
}
