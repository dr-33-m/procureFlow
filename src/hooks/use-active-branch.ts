import { useSearch } from '@tanstack/react-router'

/**
 * The active branch id, sourced from the `?branch=` search param that the
 * `_app` route guarantees is present (defaulted from the session). Read
 * synchronously during render so branch-scoped queries never wait on a
 * client-side store to hydrate.
 */
export function useActiveBranchId(): string {
  const branch = useSearch({
    strict: false,
    select: (s) => (s as { branch?: string }).branch,
  })
  return branch ?? ''
}
