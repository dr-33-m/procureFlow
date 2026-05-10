import { createFileRoute } from '@tanstack/react-router'
import { ListDetailPage } from '@/components/features/shopping-lists/list-detail-page'

export const Route = createFileRoute('/shopping-lists/$id/')({
  component: ListDetailPage,
})
