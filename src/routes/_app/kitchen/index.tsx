import { createFileRoute } from '@tanstack/react-router'
import { KitchenPage } from '@/components/features/kitchen/kitchen-page'
import { PendingPage } from '@/components/ui/pending-page'
import {
  listKitchenStockOptions,
  getReconciliationHistoryOptions,
} from '@/lib/query-manager/kitchen/options'

export const Route = createFileRoute('/_app/kitchen/')({
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch } }) => {
    if (!branch) return
    await Promise.all([
      queryClient.ensureQueryData(
        listKitchenStockOptions({ branchId: branch, status: 'pending' }),
      ),
      queryClient.ensureQueryData(
        listKitchenStockOptions({ branchId: branch, status: 'partial' }),
      ),
      queryClient.ensureQueryData(getReconciliationHistoryOptions(branch)),
    ])
  },
  component: KitchenPage,
  pendingComponent: () => (
    <PendingPage
      title="Kitchen"
      description="Items issued to the kitchen, waiting for the chef to close out at end of day."
    />
  ),
})
