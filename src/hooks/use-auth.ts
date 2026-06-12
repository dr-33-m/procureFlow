import { useRouteContext } from '@tanstack/react-router'
import type { AppSessionData } from '@/server/auth/session'

export type AuthState = AppSessionData | null

/**
 * The authenticated user, resolved once by the `_app` route's beforeLoad and
 * read from its route context. Only valid within the `_app` subtree.
 */
export function useAuth(): AuthState {
  return useRouteContext({ from: '/_app', select: (c) => c.auth })
}
