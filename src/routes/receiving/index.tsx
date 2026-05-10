import { createFileRoute } from '@tanstack/react-router'
import { ReceivingListPage } from '@/components/features/receiving/receiving-list-page'

export const Route = createFileRoute('/receiving/')({
  component: ReceivingListPage,
})
