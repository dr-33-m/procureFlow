import { createFileRoute } from '@tanstack/react-router'
import { IssuancePage } from '@/components/features/issuance/issuance-page'
import { IssuanceSkeleton } from '@/components/skeletons/issuance-skeleton'
import {
  getInventoryForIssuanceOptions,
  getRecentIssuancesOptions,
  getTodayIssuanceStatsOptions,
} from '@/lib/query-manager/issuance/options'

export const Route = createFileRoute('/_app/issuance/')({
  validateSearch: (s: Record<string, unknown>) => ({
    category: (s.category as string) || undefined,
    q: (s.q as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch } }) => {
    if (!branch) return
    await Promise.all([
      queryClient.ensureQueryData(getInventoryForIssuanceOptions(branch)),
      queryClient.ensureQueryData(getTodayIssuanceStatsOptions(branch)),
      queryClient.ensureQueryData(getRecentIssuancesOptions(branch)),
    ])
  },
  component: IssuancePage,
  pendingComponent: IssuanceSkeleton,
})
