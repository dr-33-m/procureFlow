import { getReceivingLists, getReceivingList } from '@/server/receiving'
import { receivingKeys } from './keys'

export function getReceivingListsOptions() {
  return {
    queryKey: receivingKeys.lists(),
    queryFn: () => getReceivingLists(),
    staleTime: 30_000,
  }
}

export function getReceivingListOptions(id: string) {
  return {
    queryKey: receivingKeys.list(id),
    queryFn: () => getReceivingList({ data: id }),
    staleTime: 15_000,
    enabled: !!id,
  }
}
