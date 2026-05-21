import {
  listMenus,
  getMenuWithDishes,
  getRecentMenuActivity,
  getMenuReconciliationStats,
} from '@/server/menus'
import { menuKeys, type MenuListParams } from './keys'

export function listMenusOptions(params: MenuListParams) {
  return {
    queryKey: menuKeys.list(params),
    queryFn: () => listMenus({ data: params }),
    staleTime: 30_000,
    enabled: !!params.branchId,
  }
}

export function getMenuWithDishesOptions(menuId: string) {
  return {
    queryKey: menuKeys.detail(menuId),
    queryFn: () => getMenuWithDishes({ data: menuId }),
    staleTime: 30_000,
    enabled: !!menuId,
  }
}

export function getRecentMenuActivityOptions(branchId: string) {
  return {
    queryKey: menuKeys.recentActivity(branchId),
    queryFn: () => getRecentMenuActivity({ data: branchId }),
    staleTime: 60_000,
    enabled: !!branchId,
  }
}

export function getMenuReconciliationStatsOptions(menuId: string) {
  return {
    queryKey: menuKeys.reconciliationStats(menuId),
    queryFn: () => getMenuReconciliationStats({ data: menuId }),
    staleTime: 30_000,
    enabled: !!menuId,
  }
}
