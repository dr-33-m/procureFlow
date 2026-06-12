import { createFileRoute } from "@tanstack/react-router"
import { deleteCookie } from "@tanstack/react-start/server"
import { COOKIE_OPTIONS } from "@/server/auth/session"

/**
 * Post-logout landing from Logto's end_session redirect. Cookies were already
 * cleared on the /auth/sign-out response; clearing again here is an idempotent
 * safety net before sending the user to the sign-in page.
 */
export const Route = createFileRoute("/auth/sign-out/callback")({
  server: {
    handlers: {
      GET: async () => {
        deleteCookie("procureflow", COOKIE_OPTIONS)
        deleteCookie("procureflow-logto", COOKIE_OPTIONS)

        return new Response(null, {
          status: 302,
          headers: { Location: "/auth/sign-in" },
        })
      },
    },
  },
})
