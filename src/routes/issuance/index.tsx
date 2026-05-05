import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import {
  getInventoryForIssuanceOptions,
  getRecentIssuancesOptions,
  getTodayIssuanceStatsOptions,
} from '@/lib/query-manager/issuance/options'
import { IssuancePage } from '@/components/features/issuance/issuance-page'

export const Route = createFileRoute('/issuance/')({
  validateSearch: (s: Record<string, unknown>) => ({
    category: (s.category as string) || undefined,
    q: (s.q as string) || undefined,
  }),
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(getInventoryForIssuanceOptions()),
      queryClient.ensureQueryData(getRecentIssuancesOptions()),
      queryClient.ensureQueryData(getTodayIssuanceStatsOptions()),
    ]),
  component: IssuancePage,
})
