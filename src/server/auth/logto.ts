import LogtoClient from "@logto/node"
import { LogtoSessionStorage } from "./storage"
import { useLogtoSession } from "./session"

const logtoConfig = {
  endpoint: process.env.LOGTO_ENDPOINT!,
  appId: process.env.LOGTO_APP_ID!,
  scopes: ['profile', 'email'],
}

/**
 * Module-level cache for Logto's well-known data (OIDC discovery config +
 * JWKS), shared across requests. Without it every request builds a fresh
 * client and re-fetches discovery from the remote Logto server — a full
 * cross-server round trip per call. The TTL guards against key rotation.
 */
const WELL_KNOWN_TTL_MS = 60 * 60_000
const wellKnownCache = new Map<string, { value: string; expiresAt: number }>()

const oidcCache = {
  async getItem(key: string) {
    const hit = wellKnownCache.get(key)
    if (!hit || hit.expiresAt < Date.now()) return null
    return hit.value
  },
  async setItem(key: string, value: string) {
    wellKnownCache.set(key, { value, expiresAt: Date.now() + WELL_KNOWN_TTL_MS })
  },
  async removeItem(key: string) {
    wellKnownCache.delete(key)
  },
}

/**
 * Creates a Logto client for the current request.
 * OIDC tokens are stored in the procureflow-logto session cookie via
 * LogtoSessionStorage — a single cookie that session.clear() can reliably wipe.
 *
 * The navigate URL (sign-in redirect / end_session endpoint) is captured
 * internally and returned via getNavigateUrl() so callers control the redirect.
 */
export async function createLogtoClient() {
  const session = await useLogtoSession()
  const storage = new LogtoSessionStorage(session)

  let navigateUrl = ""
  const client = new LogtoClient(logtoConfig, {
    storage,
    navigate: (url: string) => {
      navigateUrl = url
    },
    unstable_cache: oidcCache,
  })

  return { client, getNavigateUrl: () => navigateUrl }
}
