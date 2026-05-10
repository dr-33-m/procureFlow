import { createFileRoute, redirect } from '@tanstack/react-router'
import { CreateListPage } from '@/components/features/shopping-lists/create-list-page'

export const Route = createFileRoute('/shopping-lists/create')({
  beforeLoad: ({ context }) => {
    if (context.auth?.userRole === 'runner') {
      throw redirect({ to: '/shopping-lists', search: { filter: undefined } })
    }
  },
  component: CreateListPage,
})
