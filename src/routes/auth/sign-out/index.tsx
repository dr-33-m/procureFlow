import { createFileRoute } from "@tanstack/react-router"
import { deleteCookie } from "@tanstack/react-start/server"
import { createLogtoClient } from "@/server/auth/logto"
import { COOKIE_OPTIONS } from "@/server/auth/session"

const SIGN_OUT_TIMEOUT_MS = 4000

/**
 * Logout as a plain HTTP redirect chain — no SSR, no beforeLoad, no server-fn
 * redirect serialization. The remote Logto call (discovery + token revocation)
 * is raced against a timeout so an unreachable Logto can never hang logout;
 * local cookie clearing always happens on this response.
 */
export const Route = createFileRoute("/auth/sign-out/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin
        const postLogoutRedirect = `${origin}/auth/sign-out/callback`

        let location = "/auth/sign-in"
        try {
          const { client, getNavigateUrl } = await createLogtoClient()
          await Promise.race([
            client.signOut(postLogoutRedirect),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Logto signOut timed out")),
                SIGN_OUT_TIMEOUT_MS,
              ),
            ),
          ])
          location = getNavigateUrl() || location
        } catch (err) {
          console.error("[sign-out] best-effort remote sign-out failed:", err)
        }

        deleteCookie("procureflow", COOKIE_OPTIONS)
        deleteCookie("procureflow-logto", COOKIE_OPTIONS)

        return new Response(null, {
          status: 302,
          headers: { Location: location },
        })
      },
    },
  },
})
