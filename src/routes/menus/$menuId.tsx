import { createFileRoute } from '@tanstack/react-router'
import { MenuDetailPage } from '@/components/features/menus/menu-detail-page'

export const Route = createFileRoute('/menus/$menuId')({
  component: MenuDetailPage,
})
