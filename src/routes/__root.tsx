import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ProcureFlow' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
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
