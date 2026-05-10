import { createFileRoute, redirect } from '@tanstack/react-router'
import { RunnerPage } from '@/components/features/shopping-lists/runner-page'

export const Route = createFileRoute('/shopping-lists/$id/run')({
  beforeLoad: ({ context, params }) => {
    if (context.auth?.userRole !== 'runner') {
      throw redirect({ to: '/shopping-lists/$id', params: { id: params.id } })
    }
  },
  component: RunnerRoute,
})

function RunnerRoute() {
  const { id } = Route.useParams()
  return <RunnerPage listId={id} />
}
