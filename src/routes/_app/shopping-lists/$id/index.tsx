import { createFileRoute } from '@tanstack/react-router'
import { ListDetailPage } from '@/components/features/shopping-lists/list-detail-page'
import { TablePageSkeleton } from '@/components/skeletons/table-page-skeleton'
import { getShoppingListOptions } from '@/lib/query-manager/shopping-lists/options'

export const Route = createFileRoute('/_app/shopping-lists/$id/')({
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch }, params: { id } }) => {
    if (!branch) return
    await queryClient.ensureQueryData(getShoppingListOptions(branch, id))
  },
  component: ListDetailPage,
  pendingComponent: () => (
    <TablePageSkeleton title="Shopping List" label="Loading list…" />
  ),
})
