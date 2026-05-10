import LogtoClient from "@logto/node"
import { LogtoSessionStorage } from "./storage"
import { useLogtoSession } from "./session"

const logtoConfig = {
  endpoint: process.env.LOGTO_ENDPOINT!,
  appId: process.env.LOGTO_APP_ID!,
  scopes: ['profile', 'email'],
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
  })

  return { client, getNavigateUrl: () => navigateUrl }
}
