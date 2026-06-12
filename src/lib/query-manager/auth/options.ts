import { getSessionUser } from '@/server/auth/functions'
import { authKeys } from './keys'

/**
 * Query options for the current authenticated user (session-derived).
 *
 * Cached generously so the auth check is served from the React Query cache
 * across navigations instead of a server round-trip on every route change.
 * The encrypted session cookie is the source of truth; profile mutations that
 * change session data invalidate this key, and logout is a full document
 * navigation so the cache dies with the page.
 * Used by the `_app` / onboarding route guards via `ensureQueryData`.
 */
export function currentUserQueryOptions() {
  return {
    queryKey: authKeys.currentUser(),
    queryFn: () => getSessionUser(),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  }
}
