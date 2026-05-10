import { createServerFn } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import { getRequestUrl, deleteCookie } from "@tanstack/react-start/server"
import { createLogtoClient } from "./logto"
import { getAppSession, COOKIE_OPTIONS } from "./session"
import { db, users, companyMembers, branchMembers, branches } from "@/db"
import { eq } from "drizzle-orm"
import type { UserRole } from "@/types"

/**
 * Initiates the Logto sign-in flow.
 * Redirects the user to Logto's sign-in page.
 */
export const signIn = createServerFn({ method: "GET" }).handler(async () => {
  const url = getRequestUrl()
  const callbackUrl = `${url.origin}/auth/sign-in/callback`

  const { client, getNavigateUrl } = await createLogtoClient()
  await client.signIn(callbackUrl)
  throw redirect({ href: getNavigateUrl() })
})

/**
 * Handles the Logto OAuth callback.
 * Exchanges the auth code for tokens, finds/creates the local user,
 * populates the app session, and redirects to the app.
 */
export const handleCallback = createServerFn({ method: "GET" }).handler(
  async () => {
    const url = getRequestUrl()
    const callbackUrl = url.href

    const { client } = await createLogtoClient()
    await client.handleSignInCallback(callbackUrl)

    // Get user info from Logto
    const context = await client.getContext({ fetchUserInfo: true })
    if (!context.isAuthenticated || !context.claims) {
      throw redirect({ to: "/auth/sign-in" })
    }

    const logtoId = context.claims.sub
    const email = context.userInfo?.email ?? context.claims.email ?? ""
    const name =
      context.userInfo?.name ??
      context.claims.name ??
      email.split("@")[0] ??
      "User"
    const avatar = (context.userInfo?.picture as string | undefined) ?? null

    // Find or create local user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.logtoId, logtoId))
      .limit(1)

    if (user) {
      // Returning user — sync name/avatar from Logto if changed
      const updates: Record<string, string | null> = {}
      if (name && user.name !== name) updates.name = name
      if (avatar !== user.avatar) updates.avatar = avatar
      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, user.id))
        user = { ...user, ...updates }
      }
    } else {
      // Check if a user with this email already exists (invited but not yet linked)
      ;[user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (user) {
        // Link existing user to Logto and sync name/avatar
        await db
          .update(users)
          .set({ logtoId, name, avatar })
          .where(eq(users.id, user.id))
        user = { ...user, logtoId, name, avatar }
      } else {
        // Create new user
        ;[user] = await db
          .insert(users)
          .values({ logtoId, name, email, avatar })
          .returning()
      }
    }

    // Check if user has a company membership
    const membership = await resolveUserMembership(user.id)

    const session = await getAppSession()

    if (membership) {
      await session.update({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: membership.role,
        companyId: membership.companyId,
        defaultBranchId: membership.defaultBranchId,
      })
      throw redirect({ to: "/" })
    } else {
      // New user with no company — send to onboarding
      await session.update({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: undefined as unknown as UserRole,
        companyId: "",
        defaultBranchId: "",
      })
      throw redirect({ to: "/onboarding/role-select" })
    }
  }
)

/**
 * Signs the user out. Clears both the app session and the Logto session cookie,
 * then redirects to Logto's end_session endpoint.
 *
 * Uses `throw redirect()` so the 307 Response carries Set-Cookie headers
 * that actually clear the session cookies in the browser.
 */
export const signOut = createServerFn({ method: "GET" }).handler(async () => {
  const url = getRequestUrl()
  const postLogoutRedirect = `${url.origin}/auth/sign-out/callback`

  const { client, getNavigateUrl } = await createLogtoClient()
  await client.signOut(postLogoutRedirect)

  throw redirect({ href: getNavigateUrl() || postLogoutRedirect })
})

/**
 * Clears both session cookies. Called from the post-logout callback route
 * after Logto redirects back, so the Set-Cookie headers are on a clean
 * same-origin response rather than a cross-origin redirect chain.
 */
export const clearSessionCookies = createServerFn({ method: "GET" }).handler(
  async () => {
    deleteCookie("procureflow", COOKIE_OPTIONS)
    deleteCookie("procureflow-logto", COOKIE_OPTIONS)
  }
)

/**
 * Returns the current session user context for client-side consumption.
 * Used by the root route's beforeLoad to check auth status.
 */
export const getSessionUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getAppSession()
    const { userId, companyId } = session.data

    if (!userId) {
      return { authenticated: false as const }
    }

    if (!companyId) {
      return { authenticated: true as const, needsOnboarding: true as const }
    }

    return {
      authenticated: true as const,
      needsOnboarding: false as const,
      user: session.data,
    }
  }
)

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveUserMembership(userId: string) {
  // Check company-level membership first (owner/admin)
  const [companyMembership] = await db
    .select({
      role: companyMembers.role,
      companyId: companyMembers.companyId,
    })
    .from(companyMembers)
    .where(eq(companyMembers.userId, userId))
    .limit(1)

  if (companyMembership) {
    // Get the first branch of the company as default
    const [firstBranch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.companyId, companyMembership.companyId))
      .limit(1)

    return {
      role: companyMembership.role as UserRole,
      companyId: companyMembership.companyId,
      defaultBranchId: firstBranch?.id ?? "",
    }
  }

  // Check branch-level membership (chef/runner)
  const [branchMembership] = await db
    .select({
      role: branchMembers.role,
      branchId: branchMembers.branchId,
    })
    .from(branchMembers)
    .where(eq(branchMembers.userId, userId))
    .limit(1)

  if (branchMembership) {
    // Get the company ID from the branch
    const [branch] = await db
      .select({ companyId: branches.companyId })
      .from(branches)
      .where(eq(branches.id, branchMembership.branchId))
      .limit(1)

    return {
      role: branchMembership.role as UserRole,
      companyId: branch?.companyId ?? "",
      defaultBranchId: branchMembership.branchId,
    }
  }

  return null
}
