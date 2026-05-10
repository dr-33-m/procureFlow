import { createFileRoute } from '@tanstack/react-router'
import { CreateListPage } from '@/components/features/shopping-lists/create-list-page'

export const Route = createFileRoute('/shopping-lists/create')({
  component: CreateListPage,
})
