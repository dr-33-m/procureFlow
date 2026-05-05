import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { getShoppingListsOptions } from '@/lib/query-manager/shopping-lists/options'
import { ShoppingListsPage } from '@/components/features/shopping-lists/shopping-lists-page'

export const Route = createFileRoute('/shopping-lists/')({
  validateSearch: (s: Record<string, unknown>) => ({
    filter: (s.filter as string) || undefined,
  }),
  loader: () => queryClient.ensureQueryData(getShoppingListsOptions()),
  component: ShoppingListsPage,
})
