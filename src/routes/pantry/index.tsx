import { createFileRoute } from '@tanstack/react-router'
import { PantryPage } from '@/components/features/pantry/pantry-page'

export const Route = createFileRoute('/pantry/')({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page ?? 1),
    category: (s.category as string) || undefined,
    sortBy: (s.sortBy as string) || undefined,
    q: (s.q as string) || undefined,
  }),
  component: PantryPage,
})
