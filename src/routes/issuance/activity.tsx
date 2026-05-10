import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from '@/components/features/issuance/activity-page'

export const Route = createFileRoute('/issuance/activity')({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page ?? 1),
  }),
  component: ActivityPage,
})
