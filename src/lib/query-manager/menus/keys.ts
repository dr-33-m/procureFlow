export type MenuListParams = {
  branchId: string
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'event'
  includeInactive?: boolean
}

export const menuKeys = {
  all: ['menus'] as const,
  list: (params: MenuListParams) => [...menuKeys.all, 'list', params] as const,
  detail: (menuId: string) => [...menuKeys.all, 'detail', menuId] as const,
  reconciliationStats: (menuId: string) =>
    [...menuKeys.all, 'reconciliation-stats', menuId] as const,
  recentActivity: (branchId: string) => [...menuKeys.all, 'recent', branchId] as const,
}
