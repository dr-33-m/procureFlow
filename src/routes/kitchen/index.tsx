import { createFileRoute } from '@tanstack/react-router'
import { KitchenPage } from '@/components/features/kitchen/kitchen-page'

export const Route = createFileRoute('/kitchen/')({
  component: KitchenPage,
})
