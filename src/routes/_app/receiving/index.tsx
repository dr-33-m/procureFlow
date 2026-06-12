import { createFileRoute, redirect } from '@tanstack/react-router'
import { ReceivingListPage } from '@/components/features/receiving/receiving-list-page'
import { PendingPage } from '@/components/ui/pending-page'
import { getReceivingListsOptions } from '@/lib/query-manager/receiving/options'

export const Route = createFileRoute('/_app/receiving/')({
  beforeLoad: ({ context }) => {
    const role = context.auth?.userRole
    if (role !== 'owner' && role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch } }) => {
    if (!branch) return
    await queryClient.ensureQueryData(getReceivingListsOptions(branch))
  },
  component: ReceivingListPage,
  pendingComponent: () => (
    <PendingPage
      title="Receiving & Staging"
      description="Review inbound deliveries and reconcile items against purchase orders."
    />
  ),
})
