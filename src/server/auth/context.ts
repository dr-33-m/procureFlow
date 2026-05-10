import { db, branchMembers, branches } from '@/db'
import { eq, and } from 'drizzle-orm'
import { getAppSession } from './session'
import type { UserRole, AuthContext } from '@/types'

/**
 * Extracts the authenticated user's context from the session.
 * Throws if the user is not authenticated.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await getAppSession()
  const { userId } = session.data

  if (!userId) {
    throw new Error('Unauthorized')
  }

  return session.data as AuthContext
}

/**
 * Throws 403 if the user's role is not in the allowed list.
 */
export function requireRole(ctx: AuthContext, ...roles: UserRole[]): void {
  if (!roles.includes(ctx.userRole)) {
    throw new Error(`Forbidden: requires one of [${roles.join(', ')}]`)
  }
}

/**
 * Validates that the user has access to the given branch.
 * Company-level members (owner/admin) can access any branch in their company.
 * Branch-level members (chef/runner) can only access their assigned branch.
 */
export async function validateBranchAccess(
  ctx: AuthContext,
  branchId: string,
): Promise<void> {
  if (ctx.userRole === 'owner' || ctx.userRole === 'admin') {
    // Company-level: verify branch belongs to their company
    const [branch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.companyId, ctx.companyId)))
      .limit(1)

    if (!branch) {
      throw new Error('Forbidden: branch not in your company')
    }
  } else {
    // Branch-level: verify membership
    const [membership] = await db
      .select({ id: branchMembers.id })
      .from(branchMembers)
      .where(
        and(
          eq(branchMembers.branchId, branchId),
          eq(branchMembers.userId, ctx.userId),
        ),
      )
      .limit(1)

    if (!membership) {
      throw new Error('Forbidden: not a member of this branch')
    }
  }
}
