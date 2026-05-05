import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { getShoppingListOptions } from '@/lib/query-manager/shopping-lists/options'
import { ListDetailPage } from '@/components/features/shopping-lists/list-detail-page'

export const Route = createFileRoute('/shopping-lists/$id/')({
  loader: ({ params }) => queryClient.ensureQueryData(getShoppingListOptions(params.id)),
  component: ListDetailPage,
})
