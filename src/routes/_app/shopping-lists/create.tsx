import { createFileRoute, redirect } from '@tanstack/react-router'
import { CreateListPage } from '@/components/features/shopping-lists/create-list-page'

type CreateListSearch = {
  ai?: boolean
}

export const Route = createFileRoute('/_app/shopping-lists/create')({
  validateSearch: (search: Record<string, unknown>): CreateListSearch => ({
    ai: search.ai === true || search.ai === 'true' ? true : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (context.auth?.userRole === 'runner') {
      throw redirect({ to: '/shopping-lists', search: { filter: undefined } })
    }
  },
  component: CreateListPage,
})
