export const shoppingListKeys = {
  all: ['shopping-lists'] as const,
  lists: (branchId: string, filter?: string) =>
    [...shoppingListKeys.all, 'list', branchId, filter ?? 'all'] as const,
  detail: (branchId: string, id: string) =>
    [...shoppingListKeys.all, 'detail', branchId, id] as const,
  catalog: (branchId: string) => [...shoppingListKeys.all, 'catalog', branchId] as const,
  catalogWithStock: (branchId: string) =>
    [...shoppingListKeys.all, 'catalog-with-stock', branchId] as const,
  runners: (branchId: string) => [...shoppingListKeys.all, 'runners', branchId] as const,
}
