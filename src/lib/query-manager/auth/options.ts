import { getSessionUser } from '@/server/auth/functions'
import { authKeys } from './keys'

/**
 * Query options for the current authenticated user (session-derived).
 *
 * Cached for 5 minutes so the auth check is served from the React Query cache
 * across navigations instead of a server round-trip on every route change.
 * Used by the `_app` / onboarding route guards via `ensureQueryData`.
 */
export function currentUserQueryOptions() {
  return {
    queryKey: authKeys.currentUser(),
    queryFn: () => getSessionUser(),
    staleTime: 5 * 60_000,
    retry: false,
  }
}
