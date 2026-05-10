import { createFileRoute, redirect } from '@tanstack/react-router'
import { CompanySettingsPage } from '@/components/features/settings/company'
import { getSessionUser } from '@/server/auth/functions'

export const Route = createFileRoute('/settings/company')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string | undefined) ?? 'general',
  }),
  beforeLoad: async () => {
    const result = await getSessionUser()
    if (!result.authenticated || result.needsOnboarding) return
    const role = (result as { user?: { userRole?: string } }).user?.userRole
    if (role !== 'owner' && role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: CompanySettingsPage,
})
