import { useEffect } from 'react'
import {
  Outlet,
  createFileRoute,
  redirect,
  retainSearchParams,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { currentUserQueryOptions } from '@/lib/query-manager/auth/options'
import { getCompanyBranchesOptions } from '@/lib/query-manager/company/options'
import { useActiveBranchId } from '@/hooks/use-active-branch'
import { useBranchContext } from '@/stores/branch-context'
import type { AppSessionData } from '@/server/auth/session'

type AppSearch = { branch?: string }

export const Route = createFileRoute('/_app')({
  validateSearch: (search: Record<string, unknown>): AppSearch => ({
    branch: typeof search.branch === 'string' ? search.branch : undefined,
  }),
  search: {
    middlewares: [retainSearchParams(['branch'])],
  },

  beforeLoad: async ({ context, location, search }) => {
    const result = await context.queryClient.ensureQueryData(
      currentUserQueryOptions(),
    )

    if (!result.authenticated) {
      throw redirect({ to: '/auth/sign-in' })
    }
    if (result.needsOnboarding) {
      throw redirect({ to: '/onboarding/role-select' })
    }

    // Ensure the active branch is present in the URL so loaders can prefetch
    // branch-scoped data. Default to the user's home branch.
    if (!search.branch && result.user.defaultBranchId) {
      throw redirect({
        to: location.pathname,
        search: { ...search, branch: result.user.defaultBranchId },
        replace: true,
      })
    }

    // Session data is fully populated for an authenticated, onboarded user.
    return { auth: result.user as AppSessionData }
  },

  // Branch names for the switcher — prefetched once for the whole app shell.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(getCompanyBranchesOptions()),

  component: AppRoute,
})

/**
 * Mirrors the URL's active branch + the branch list into the client store so
 * the header switcher can render names. Data hooks read the branch from the
 * URL directly (useActiveBranchId), not from this store.
 */
function BranchSync() {
  const branchId = useActiveBranchId()
  const { data: branches } = useQuery(getCompanyBranchesOptions())
  const setBranches = useBranchContext((s) => s.setBranches)
  const setActiveBranch = useBranchContext((s) => s.setActiveBranch)

  useEffect(() => {
    if (branches) {
      setBranches(branches.map((b) => ({ id: b.id, name: b.name })))
    }
  }, [branches, setBranches])

  useEffect(() => {
    if (branchId) setActiveBranch(branchId)
  }, [branchId, setActiveBranch])

  return null
}

function AppRoute() {
  return (
    <AppLayout>
      <BranchSync />
      <Outlet />
    </AppLayout>
  )
}
