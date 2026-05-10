import {
  getInventoryForIssuance,
  searchProducts,
  getRecentIssuances,
  getTodayIssuanceStats,
  getAllIssuances,
} from '@/server/issuance'
import { issuanceKeys } from './keys'

export function getInventoryForIssuanceOptions(branchId: string) {
  return {
    queryKey: issuanceKeys.inventory(branchId),
    queryFn: () => getInventoryForIssuance({ data: branchId }),
    staleTime: 30_000,
    enabled: !!branchId,
  }
}

export function searchProductsOptions(branchId: string, q: string) {
  return {
    queryKey: issuanceKeys.search(branchId, q),
    queryFn: () => searchProducts({ data: { branchId, query: q } }),
    staleTime: 15_000,
    enabled: !!branchId && q.length >= 2,
  }
}

export function getRecentIssuancesOptions(branchId: string) {
  return {
    queryKey: issuanceKeys.recent(branchId),
    queryFn: () => getRecentIssuances({ data: branchId }),
    staleTime: 15_000,
    enabled: !!branchId,
  }
}

export function getTodayIssuanceStatsOptions(branchId: string) {
  return {
    queryKey: issuanceKeys.stats(branchId),
    queryFn: () => getTodayIssuanceStats({ data: branchId }),
    staleTime: 60_000,
    enabled: !!branchId,
  }
}

export function getAllIssuancesOptions(branchId: string, page: number, pageSize = 20) {
  return {
    queryKey: issuanceKeys.activity(branchId, page),
    queryFn: () => getAllIssuances({ data: { branchId, page, pageSize } }),
    staleTime: 30_000,
    enabled: !!branchId,
  }
}
