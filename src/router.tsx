import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { AppSessionData } from './server/auth/session'

export type RouterContext = {
  auth: (AppSessionData & { authenticated: true; needsOnboarding: false }) | null
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: {
      auth: null,
    } satisfies RouterContext,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
