import { createFileRoute } from '@tanstack/react-router'
import { IssuancePage } from '@/components/features/issuance/issuance-page'

export const Route = createFileRoute('/issuance/')({
  validateSearch: (s: Record<string, unknown>) => ({
    category: (s.category as string) || undefined,
    q: (s.q as string) || undefined,
  }),
  component: IssuancePage,
})
