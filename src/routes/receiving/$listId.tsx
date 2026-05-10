import { createFileRoute, redirect } from '@tanstack/react-router'
import { ReceivingDetailPage } from '@/components/features/receiving/receiving-detail-page'

export const Route = createFileRoute('/receiving/$listId')({
  beforeLoad: ({ context }) => {
    const role = context.auth?.userRole
    if (role !== 'owner' && role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: ReceivingDetailPage,
})
