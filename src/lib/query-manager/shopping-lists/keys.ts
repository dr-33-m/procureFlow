export const shoppingListKeys = {
  all: ['shopping-lists'] as const,
  lists: (filter?: string) => [...shoppingListKeys.all, 'list', filter ?? 'all'] as const,
  detail: (id: string) => [...shoppingListKeys.all, 'detail', id] as const,
  catalog: () => [...shoppingListKeys.all, 'catalog'] as const,
  catalogWithStock: () => [...shoppingListKeys.all, 'catalog-with-stock'] as const,
  runners: () => [...shoppingListKeys.all, 'runners'] as const,
}
