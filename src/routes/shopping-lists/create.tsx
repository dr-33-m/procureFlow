import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import {
  getRunnersOptions,
  getProductsWithStockOptions,
} from '@/lib/query-manager/shopping-lists/options'
import { CreateListPage } from '@/components/features/shopping-lists/create-list-page'

export const Route = createFileRoute('/shopping-lists/create')({
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(getRunnersOptions()),
      queryClient.ensureQueryData(getProductsWithStockOptions()),
    ]),
  component: CreateListPage,
})
