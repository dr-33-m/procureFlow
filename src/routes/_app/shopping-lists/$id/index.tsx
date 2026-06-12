import { createFileRoute } from '@tanstack/react-router'
import { ListDetailPage } from '@/components/features/shopping-lists/list-detail-page'
import { PendingPage } from '@/components/ui/pending-page'
import { getShoppingListOptions } from '@/lib/query-manager/shopping-lists/options'

export const Route = createFileRoute('/_app/shopping-lists/$id/')({
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch }, params: { id } }) => {
    if (!branch) return
    await queryClient.ensureQueryData(getShoppingListOptions(branch, id))
  },
  component: ListDetailPage,
  pendingComponent: () => <PendingPage title="Shopping List" />,
})
