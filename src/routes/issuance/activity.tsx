import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { getAllIssuancesOptions } from '@/lib/query-manager/issuance/options'
import { ActivityPage } from '@/components/features/issuance/activity-page'

const PAGE_SIZE = 20

export const Route = createFileRoute('/issuance/activity')({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page ?? 1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps: { page } }) =>
    queryClient.ensureQueryData(getAllIssuancesOptions(page, PAGE_SIZE)),
  component: ActivityPage,
})
