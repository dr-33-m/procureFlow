export type KitchenStockParams = {
  branchId: string
  status?: 'pending' | 'partial' | 'reconciled' | 'all'
}

export const kitchenKeys = {
  all: ['kitchen'] as const,
  stock: (params: KitchenStockParams) => [...kitchenKeys.all, 'stock', params] as const,
  history: (branchId: string) => [...kitchenKeys.all, 'history', branchId] as const,
}
