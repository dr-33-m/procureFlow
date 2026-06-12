import { createFileRoute } from '@tanstack/react-router'
import { MenuDetailPage } from '@/components/features/menus/menu-detail-page'
import { TablePageSkeleton } from '@/components/skeletons/table-page-skeleton'
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
  pendingComponent: () => (
    <TablePageSkeleton title="Menu" label="Loading menu…" />
  ),
})
