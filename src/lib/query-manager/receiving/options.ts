import { getReceivingLists, getReceivingList } from '@/server/receiving'
import { receivingKeys } from './keys'

export function getReceivingListsOptions(branchId: string) {
  return {
    queryKey: receivingKeys.lists(branchId),
    queryFn: () => getReceivingLists({ data: branchId }),
    staleTime: 30_000,
    enabled: !!branchId,
  }
}

export function getReceivingListOptions(branchId: string, id: string) {
  return {
    queryKey: receivingKeys.list(branchId, id),
    queryFn: () => getReceivingList({ data: { branchId, listId: id } }),
    staleTime: 15_000,
    enabled: !!branchId && !!id,
  }
}
