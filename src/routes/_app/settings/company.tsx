import { createFileRoute, redirect } from '@tanstack/react-router'
import { CompanySettingsPage } from '@/components/features/settings/company'
import { PendingPage } from '@/components/ui/pending-page'
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
  pendingComponent: () => (
    <PendingPage
      title="Company"
      description="Manage your company settings, plan, branches, and team."
      variant="settings-form"
    />
  ),
})
