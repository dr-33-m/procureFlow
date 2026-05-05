import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import {
  getPantryStatsOptions,
  getInventoryItemsOptions,
  getCategoriesOptions,
  getPantryCatalogOptions,
} from '@/lib/query-manager/pantry/options'
import { PantryPage } from '@/components/features/pantry/pantry-page'

const PAGE_SIZE = 10

export const Route = createFileRoute('/pantry/')({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page ?? 1),
    category: (s.category as string) || undefined,
    sortBy: (s.sortBy as string) || undefined,
    q: (s.q as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({
    page: search.page,
    category: search.category ?? 'all',
    sortBy: search.sortBy ?? 'name',
    q: search.q ?? '',
  }),
  loader: ({ deps }) =>
    Promise.all([
      queryClient.ensureQueryData(getPantryStatsOptions()),
      queryClient.ensureQueryData(
        getInventoryItemsOptions({
          page: deps.page,
          pageSize: PAGE_SIZE,
          category: deps.category,
          sortBy: deps.sortBy,
          q: deps.q,
        }),
      ),
      queryClient.ensureQueryData(getCategoriesOptions()),
      queryClient.ensureQueryData(getPantryCatalogOptions()),
    ]),
  component: PantryPage,
})
