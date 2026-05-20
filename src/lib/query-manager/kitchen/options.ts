import { listKitchenStock, getReconciliationHistory } from '@/server/kitchen'
import { kitchenKeys, type KitchenStockParams } from './keys'

export function listKitchenStockOptions(params: KitchenStockParams) {
  return {
    queryKey: kitchenKeys.stock(params),
    queryFn: () => listKitchenStock({ data: params }),
    staleTime: 30_000,
    enabled: !!params.branchId,
  }
}

export function getReconciliationHistoryOptions(branchId: string) {
  return {
    queryKey: kitchenKeys.history(branchId),
    queryFn: () => getReconciliationHistory({ data: { branchId } }),
    staleTime: 60_000,
    enabled: !!branchId,
  }
}
