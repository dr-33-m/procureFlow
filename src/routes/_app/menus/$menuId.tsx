import { createFileRoute } from '@tanstack/react-router'
import { MenuDetailPage } from '@/components/features/menus/menu-detail-page'
import { PendingPage } from '@/components/ui/pending-page'
import {
  getMenuWithDishesOptions,
  getMenuReconciliationStatsOptions,
} from '@/lib/query-manager/menus/options'

export const Route = createFileRoute('/_app/menus/$menuId')({
  loader: async ({ context: { queryClient }, params: { menuId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getMenuWithDishesOptions(menuId)),
      queryClient.ensureQueryData(getMenuReconciliationStatsOptions(menuId)),
    ])
  },
  component: MenuDetailPage,
  pendingComponent: () => <PendingPage title="Menu" />,
})
