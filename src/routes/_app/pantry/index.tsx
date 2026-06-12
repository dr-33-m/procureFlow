import { createFileRoute } from '@tanstack/react-router'
import { PantryPage } from '@/components/features/pantry/pantry-page'
import { PendingPage } from '@/components/ui/pending-page'
import {
  getPantryStatsOptions,
  getCategoriesOptions,
} from '@/lib/query-manager/pantry/options'

export const Route = createFileRoute('/_app/pantry/')({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page ?? 1),
    category: (s.category as string) || undefined,
    sortBy: (s.sortBy as string) || undefined,
    q: (s.q as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  // Prefetch the branch-scoped, param-independent queries. The paginated items
  // query is keyed by page/category/sort and is fetched by the component.
  loader: async ({ context: { queryClient }, deps: { branch } }) => {
    if (!branch) return
    await Promise.all([
      queryClient.ensureQueryData(getPantryStatsOptions(branch)),
      queryClient.ensureQueryData(getCategoriesOptions(branch)),
    ])
  },
  component: PantryPage,
  pendingComponent: () => (
    <PendingPage
      title="Pantry Inventory"
      description="Current stock levels for essential supplies and raw materials."
    />
  ),
})
