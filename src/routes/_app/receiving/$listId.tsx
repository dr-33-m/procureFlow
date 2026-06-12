import { createFileRoute, redirect } from '@tanstack/react-router'
import { ReceivingDetailPage } from '@/components/features/receiving/receiving-detail-page'
import { PendingPage } from '@/components/ui/pending-page'
import { getReceivingListOptions } from '@/lib/query-manager/receiving/options'

export const Route = createFileRoute('/_app/receiving/$listId')({
  beforeLoad: ({ context }) => {
    const role = context.auth?.userRole
    if (role !== 'owner' && role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({
    context: { queryClient },
    deps: { branch },
    params: { listId },
  }) => {
    if (!branch) return
    await queryClient.ensureQueryData(getReceivingListOptions(branch, listId))
  },
  component: ReceivingDetailPage,
  pendingComponent: () => <PendingPage title="Receiving" />,
})
