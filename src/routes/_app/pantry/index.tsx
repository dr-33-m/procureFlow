import { createFileRoute } from '@tanstack/react-router'
import { PantryPage } from '@/components/features/pantry/pantry-page'
import { PantrySkeleton } from '@/components/skeletons/pantry-skeleton'
import {
  getCategoriesOptions,
  getInventoryItemsOptions,
  getPantryStatsOptions,
} from '@/lib/query-manager/pantry/options'
import {
  normalizePantryItemsParams,
  normalizePantryStockStatus,
} from '@/lib/query-manager/pantry/keys'

export const Route = createFileRoute('/_app/pantry/')({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page ?? 1),
    category: (s.category as string) || undefined,
    sortBy: (s.sortBy as string) || undefined,
    stockStatus: normalizePantryStockStatus(s.stockStatus ?? s.status),
    q: (s.q as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({
    branch: search.branch,
    page: search.page,
    category: search.category,
    sortBy: search.sortBy,
    stockStatus: search.stockStatus,
    q: search.q,
  }),
  loader: async ({ context: { queryClient }, deps }) => {
    if (!deps.branch) return
    // Fire-and-forget: starts the items fetch in parallel with stats/categories
    // so the table never waits for a post-mount round trip. Deliberately NOT
    // awaited — pagination/filter navigations would otherwise flash the
    // pendingComponent on every page click.
    void queryClient.prefetchQuery(
      getInventoryItemsOptions({
        ...normalizePantryItemsParams(deps),
        branchId: deps.branch,
      }),
    )
    await Promise.all([
      queryClient.ensureQueryData(getPantryStatsOptions(deps.branch)),
      queryClient.ensureQueryData(getCategoriesOptions(deps.branch)),
    ])
  },
  component: PantryPage,
  pendingComponent: PantrySkeleton,
})
