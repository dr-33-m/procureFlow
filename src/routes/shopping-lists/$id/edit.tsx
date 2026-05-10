import { createFileRoute } from '@tanstack/react-router'
import { EditDraftPage } from '@/components/features/shopping-lists/edit-draft-page'

export const Route = createFileRoute('/shopping-lists/$id/edit')({
  component: EditDraftPage,
})
