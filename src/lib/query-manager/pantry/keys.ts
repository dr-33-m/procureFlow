export type PantryItemsParams = {
  branchId: string
  page: number
  pageSize: number
  category: string
  sortBy: string
  q?: string
}

export const pantryKeys = {
  all: ['pantry'] as const,
  stats: (branchId: string) => [...pantryKeys.all, 'stats', branchId] as const,
  items: (params: PantryItemsParams) => [...pantryKeys.all, 'items', params] as const,
  categories: (branchId: string) => [...pantryKeys.all, 'categories', branchId] as const,
  catalog: (branchId: string) => [...pantryKeys.all, 'catalog', branchId] as const,
}
