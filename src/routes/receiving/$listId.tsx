import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { getReceivingListOptions } from '@/lib/query-manager/receiving/options'
import { ReceivingDetailPage } from '@/components/features/receiving/receiving-detail-page'

export const Route = createFileRoute('/receiving/$listId')({
  loader: ({ params }) => queryClient.ensureQueryData(getReceivingListOptions(params.listId)),
  component: ReceivingDetailPage,
})
