import { createFileRoute } from '@tanstack/react-router'
import { RunnerPage } from '@/components/features/shopping-lists/runner-page'

export const Route = createFileRoute('/shopping-lists/$id/run')({
  component: RunnerRoute,
})

function RunnerRoute() {
  const { id } = Route.useParams()
  return <RunnerPage listId={id} />
}
