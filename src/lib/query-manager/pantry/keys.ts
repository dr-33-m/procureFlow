export type PantryItemsParams = {
  page: number
  pageSize: number
  category: string
  sortBy: string
  q?: string
}

export const pantryKeys = {
  all: ['pantry'] as const,
  stats: () => [...pantryKeys.all, 'stats'] as const,
  items: (params: PantryItemsParams) => [...pantryKeys.all, 'items', params] as const,
  categories: () => [...pantryKeys.all, 'categories'] as const,
}
