import { useNavigate } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/hooks/use-auth'
import { GeneralTab } from './general-tab'
import { PlanTab } from './plan-tab'
import { BranchesTab } from './branches-tab'
import { MembersTab } from './members-tab'
import { Route } from '@/routes/settings/company'

const VALID_TABS = ['general', 'plan', 'branches', 'members'] as const
type Tab = (typeof VALID_TABS)[number]

export function CompanySettingsPage() {
  const auth = useAuth()
  const isOwner = auth?.userRole === 'owner'
  const navigate = useNavigate()

  const { tab: rawTab } = Route.useSearch()
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'general'

  const setTab = (t: Tab) => {
    navigate({ to: '/settings/company', search: { tab: t }, replace: true })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    ...(isOwner ? [{ id: 'plan' as Tab, label: 'Plan' }] : []),
    ...(isOwner ? [{ id: 'branches' as Tab, label: 'Branches' }] : []),
    { id: 'members', label: 'Members' },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Company"
          description="Manage your company settings, plan, branches, and team."
        />

        <div className="flex gap-1 border-b">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'general' && <GeneralTab />}
          {tab === 'plan' && isOwner && <PlanTab />}
          {tab === 'branches' && isOwner && <BranchesTab />}
          {tab === 'members' && <MembersTab />}
        </div>
      </div>
    </AppLayout>
  )
}
