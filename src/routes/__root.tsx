import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"

import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { Toaster } from "sonner"
import type { RouterContext } from "@/router"

import appCss from "../styles.css?url"

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ProcureFlow" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
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
        {children}
        <Toaster
          position="top-center"
          closeButton
          toastOptions={{
            style: {
              background: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-sans)",
            },
            classNames: {
              success: "border-primary/30 !text-primary",
              error: "border-destructive/30 !text-destructive",
            },
          }}
        />
        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
