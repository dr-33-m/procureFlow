import { createFileRoute } from '@tanstack/react-router'
import { ReceivingDetailPage } from '@/components/features/receiving/receiving-detail-page'

export const Route = createFileRoute('/receiving/$listId')({
  component: ReceivingDetailPage,
})
