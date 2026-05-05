import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import {
  getShoppingListOptions,
  getRunnersOptions,
  getProductsWithStockOptions,
} from '@/lib/query-manager/shopping-lists/options'
import { EditDraftPage } from '@/components/features/shopping-lists/edit-draft-page'

export const Route = createFileRoute('/shopping-lists/$id/edit')({
  loader: ({ params }) =>
    Promise.all([
      queryClient.ensureQueryData(getShoppingListOptions(params.id)),
      queryClient.ensureQueryData(getRunnersOptions()),
      queryClient.ensureQueryData(getProductsWithStockOptions()),
    ]),
  component: EditDraftPage,
})
