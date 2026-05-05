export const issuanceKeys = {
  all: ['issuance'] as const,
  inventory: () => [...issuanceKeys.all, 'inventory'] as const,
  search: (q: string) => [...issuanceKeys.all, 'search', q] as const,
  recent: () => [...issuanceKeys.all, 'recent'] as const,
  stats: () => [...issuanceKeys.all, 'stats'] as const,
  activity: (page: number) => [...issuanceKeys.all, 'activity', page] as const,
}
