import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export type RouterContext = {
  queryClient: QueryClient
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  })

  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
    } satisfies RouterContext,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Show a route's pendingComponent immediately on click so navigation never
    // blocks on its loader — the clicked page appears at once with a skeleton.
    // defaultPendingMinMs (500) is left at its default to avoid a skeleton flash
    // on fast loads.
    defaultPendingMs: 0,
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
