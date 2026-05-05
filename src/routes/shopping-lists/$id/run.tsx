import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { getShoppingListOptions } from '@/lib/query-manager/shopping-lists/options'
import { RunnerPage } from '@/components/features/shopping-lists/runner-page'

export const Route = createFileRoute('/shopping-lists/$id/run')({
  loader: ({ params }) => queryClient.ensureQueryData(getShoppingListOptions(params.id)),
  component: RunnerRoute,
})

function RunnerRoute() {
  const { id } = Route.useParams()
  return <RunnerPage listId={id} />
}
