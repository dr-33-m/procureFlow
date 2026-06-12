import { createFileRoute, redirect } from '@tanstack/react-router'
import { CompanySettingsPage } from '@/components/features/settings/company'
import { CompanySettingsSkeleton } from '@/components/skeletons/company-settings-skeleton'
import {
  getCompanyOptions,
  getTierUsageOptions,
  getMembersOptions,
  getPendingInvitesOptions,
} from '@/lib/query-manager/company/options'

export const Route = createFileRoute('/_app/settings/company')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string | undefined) ?? 'general',
  }),
  beforeLoad: ({ context }) => {
    const role = context.auth?.userRole
    if (role !== 'owner' && role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getCompanyOptions()),
      queryClient.ensureQueryData(getTierUsageOptions()),
      queryClient.ensureQueryData(getMembersOptions()),
      queryClient.ensureQueryData(getPendingInvitesOptions()),
    ])
  },
  component: CompanySettingsPage,
  pendingComponent: CompanySettingsSkeleton,
})
