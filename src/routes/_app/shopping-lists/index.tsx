import { createFileRoute } from '@tanstack/react-router'
import { ShoppingListsPage } from '@/components/features/shopping-lists/shopping-lists-page'
import { ShoppingListsSkeleton } from '@/components/skeletons/shopping-lists-skeleton'
import { getShoppingListsOptions } from '@/lib/query-manager/shopping-lists/options'

export const Route = createFileRoute('/_app/shopping-lists/')({
  validateSearch: (s: Record<string, unknown>) => ({
    filter: (s.filter as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch } }) => {
    if (!branch) return
    await queryClient.ensureQueryData(getShoppingListsOptions(branch))
  },
  component: ShoppingListsPage,
  pendingComponent: ShoppingListsSkeleton,
})
