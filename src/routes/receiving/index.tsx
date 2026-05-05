import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { getReceivingListsOptions } from '@/lib/query-manager/receiving/options'
import { ReceivingListPage } from '@/components/features/receiving/receiving-list-page'

export const Route = createFileRoute('/receiving/')({
  loader: () => queryClient.ensureQueryData(getReceivingListsOptions()),
  component: ReceivingListPage,
})
