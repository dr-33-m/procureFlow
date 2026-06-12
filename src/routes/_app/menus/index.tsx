import { createFileRoute } from '@tanstack/react-router'
import { MenusPage } from '@/components/features/menus/menus-page'
import { MenusSkeleton } from '@/components/skeletons/menus-skeleton'
import {
  listMenusOptions,
  getRecentMenuActivityOptions,
} from '@/lib/query-manager/menus/options'

export const Route = createFileRoute('/_app/menus/')({
  loaderDeps: ({ search }) => ({ branch: search.branch }),
  loader: async ({ context: { queryClient }, deps: { branch } }) => {
    if (!branch) return
    await Promise.all([
      queryClient.ensureQueryData(listMenusOptions({ branchId: branch })),
      queryClient.ensureQueryData(getRecentMenuActivityOptions(branch)),
    ])
  },
  component: MenusPage,
  pendingComponent: MenusSkeleton,
})
