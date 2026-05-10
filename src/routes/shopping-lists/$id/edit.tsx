import { createFileRoute, redirect } from '@tanstack/react-router'
import { EditDraftPage } from '@/components/features/shopping-lists/edit-draft-page'

export const Route = createFileRoute('/shopping-lists/$id/edit')({
  beforeLoad: ({ context }) => {
    if (context.auth?.userRole === 'runner') {
      throw redirect({ to: '/shopping-lists', search: { filter: undefined } })
    }
  },
  component: EditDraftPage,
})
