import { createFileRoute, redirect } from '@tanstack/react-router'
import { ReceivingListPage } from '@/components/features/receiving/receiving-list-page'

export const Route = createFileRoute('/receiving/')({
  beforeLoad: ({ context }) => {
    const role = context.auth?.userRole
    if (role !== 'owner' && role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: ReceivingListPage,
})
