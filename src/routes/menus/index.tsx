import { createFileRoute } from '@tanstack/react-router'
import { MenusPage } from '@/components/features/menus/menus-page'

export const Route = createFileRoute('/menus/')({
  component: MenusPage,
})
