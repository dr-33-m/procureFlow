import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { getSessionUser } from '@/server/auth/functions'
import type { RouterContext } from '@/router'

import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ProcureFlow' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async ({ location }) => {
    // Skip auth check for auth routes
    if (location.pathname.startsWith('/auth/')) {
      return { auth: null }
    }

    const result = await getSessionUser()

    if (!result.authenticated) {
      throw redirect({ to: '/auth/sign-in' })
    }

    if (result.needsOnboarding && !location.pathname.startsWith('/onboarding')) {
      throw redirect({ to: '/onboarding/role-select' })
    }

    return {
      auth: result.authenticated && !result.needsOnboarding ? result.user : null,
    }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-center"
            closeButton
            toastOptions={{
              style: {
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-sans)',
              },
              classNames: {
                success: 'border-primary/30 !text-primary',
                error: 'border-destructive/30 !text-destructive',
              },
            }}
          />
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
