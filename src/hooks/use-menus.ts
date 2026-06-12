import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listMenusOptions,
  getMenuWithDishesOptions,
  getMenuReconciliationStatsOptions,
} from '@/lib/query-manager/menus/options'
import { menuKeys, type MenuListParams } from '@/lib/query-manager/menus/keys'
import {
  createMenu,
  createMenusFromRecipes,
  updateMenu,
  deleteMenu,
  createDish,
  updateDish,
  deleteDish,
  setDishIngredients,
} from '@/server/menus'
import { pantryKeys } from '@/lib/query-manager/pantry/keys'
import { useActiveBranchId } from '@/hooks/use-active-branch'

export function useMenus(params: Omit<MenuListParams, 'branchId'> = {}) {
  const branchId = useActiveBranchId()
  return useQuery(listMenusOptions({ ...params, branchId }))
}

export function useMenu(menuId: string) {
  return useQuery(getMenuWithDishesOptions(menuId))
}

export function useMenuReconciliationStats(menuId: string) {
  return useQuery(getMenuReconciliationStatsOptions(menuId))
}

export function useCreateMenu() {
  const queryClient = useQueryClient()
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof createMenu>[0]['data'], 'branchId'>) =>
      createMenu({ data: { ...data, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success('Menu created')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create menu')
    },
  })
}

// "Add Menu with Procly": structure free-text recipes → create menus + dishes +
// bare products. Invalidates menus (new menus) and pantry (new products).
export function useCreateMenusFromRecipes() {
  const queryClient = useQueryClient()
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (data: Omit<Parameters<typeof createMenusFromRecipes>[0]['data'], 'branchId'>) =>
      createMenusFromRecipes({ data: { ...data, branchId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      toast.success(`Created ${result.menus} menus, ${result.dishes} dishes`)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create menus')
    },
  })
}

export function useUpdateMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof updateMenu>[0]['data']) =>
      updateMenu({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success('Menu updated')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update menu')
    },
  })
}

export function useDeleteMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (menuId: string) => deleteMenu({ data: menuId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success('Menu deleted')
    },
    onError: () => toast.error('Failed to delete menu'),
  })
}

export function useCreateDish() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof createDish>[0]['data']) =>
      createDish({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success('Dish added')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add dish')
    },
  })
}

export function useUpdateDish() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof updateDish>[0]['data']) =>
      updateDish({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success('Dish updated')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update dish')
    },
  })
}

export function useDeleteDish() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dishId: string) => deleteDish({ data: dishId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success('Dish removed')
    },
    onError: () => toast.error('Failed to remove dish'),
  })
}

export function useSetDishIngredients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof setDishIngredients>[0]['data']) =>
      setDishIngredients({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success('Recipe saved')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save recipe')
    },
  })
}
