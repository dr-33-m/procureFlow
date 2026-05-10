export const issuanceKeys = {
  all: ['issuance'] as const,
  inventory: (branchId: string) => [...issuanceKeys.all, 'inventory', branchId] as const,
  search: (branchId: string, q: string) => [...issuanceKeys.all, 'search', branchId, q] as const,
  recent: (branchId: string) => [...issuanceKeys.all, 'recent', branchId] as const,
  stats: (branchId: string) => [...issuanceKeys.all, 'stats', branchId] as const,
  activity: (branchId: string, page: number) =>
    [...issuanceKeys.all, 'activity', branchId, page] as const,
}
