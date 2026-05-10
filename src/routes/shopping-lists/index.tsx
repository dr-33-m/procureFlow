import { createFileRoute } from '@tanstack/react-router'
import { ShoppingListsPage } from '@/components/features/shopping-lists/shopping-lists-page'

export const Route = createFileRoute('/shopping-lists/')({
  validateSearch: (s: Record<string, unknown>) => ({
    filter: (s.filter as string) || undefined,
  }),
  component: ShoppingListsPage,
})
