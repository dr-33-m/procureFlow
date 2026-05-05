import {
  getInventoryForIssuance,
  searchProducts,
  getRecentIssuances,
  getTodayIssuanceStats,
  getAllIssuances,
} from '@/server/issuance'
import { issuanceKeys } from './keys'

export function getInventoryForIssuanceOptions() {
  return {
    queryKey: issuanceKeys.inventory(),
    queryFn: () => getInventoryForIssuance(),
    staleTime: 30_000,
  }
}

export function searchProductsOptions(q: string) {
  return {
    queryKey: issuanceKeys.search(q),
    queryFn: () => searchProducts({ data: q }),
    staleTime: 15_000,
    enabled: q.length >= 2,
  }
}

export function getRecentIssuancesOptions() {
  return {
    queryKey: issuanceKeys.recent(),
    queryFn: () => getRecentIssuances(),
    staleTime: 15_000,
  }
}

export function getTodayIssuanceStatsOptions() {
  return {
    queryKey: issuanceKeys.stats(),
    queryFn: () => getTodayIssuanceStats(),
    staleTime: 60_000,
  }
}

export function getAllIssuancesOptions(page: number, pageSize = 20) {
  return {
    queryKey: issuanceKeys.activity(page),
    queryFn: () => getAllIssuances({ data: { page, pageSize } }),
    staleTime: 30_000,
  }
}
