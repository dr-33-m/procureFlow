import { createServerFn } from '@tanstack/react-start'
import {
  db,
  companies,
  branches,
  companyMembers,
  branchMembers,
  inviteTokens,
  users,
} from '@/db'
import { eq, and, inArray } from 'drizzle-orm'
import { getAuthContext, requireRole } from '@/server/auth/context'
import { getAppSession } from '@/server/auth/session'
import { checkTierLimit } from '@/server/tier-check'
import type { MemberWithDetails, UserRole } from '@/types'

function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const getMembers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MemberWithDetails[]> => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    // Company-level members (owner/admin)
    const companyMemberRows = await db
      .select({
        id: companyMembers.id,
        userId: companyMembers.userId,
        role: companyMembers.role,
        createdAt: companyMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
      })
      .from(companyMembers)
      .leftJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.companyId, ctx.companyId))

    // Branch-level members (chef/runner)
    const companyBranchIds = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.companyId, ctx.companyId))

    const branchIds = companyBranchIds.map((b) => b.id)
    const branchNameMap = Object.fromEntries(companyBranchIds.map((b) => [b.id, b.name]))

    let branchMemberRows: Array<{
      id: string
      userId: string
      role: string
      createdAt: Date
      branchId: string
      userName: string | null
      userEmail: string | null
      userAvatar: string | null
    }> = []

    if (branchIds.length > 0) {
      branchMemberRows = await db
        .select({
          id: branchMembers.id,
          userId: branchMembers.userId,
          role: branchMembers.role,
          createdAt: branchMembers.createdAt,
          branchId: branchMembers.branchId,
          userName: users.name,
          userEmail: users.email,
          userAvatar: users.avatar,
        })
        .from(branchMembers)
        .leftJoin(users, eq(branchMembers.userId, users.id))
        .where(inArray(branchMembers.branchId, branchIds))
    }

    const result: MemberWithDetails[] = [
      ...companyMemberRows.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName ?? '',
        userEmail: m.userEmail ?? '',
        userAvatar: m.userAvatar ?? null,
        role: m.role as UserRole,
        level: 'company' as const,
        branchId: null,
        branchName: null,
        createdAt: m.createdAt,
      })),
      ...branchMemberRows.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName ?? '',
        userEmail: m.userEmail ?? '',
        userAvatar: m.userAvatar ?? null,
        role: m.role as UserRole,
        level: 'branch' as const,
        branchId: m.branchId,
        branchName: branchNameMap[m.branchId] ?? null,
        createdAt: m.createdAt,
      })),
    ]

    return result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  },
)

export const createInvite = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { email: string; role: string; branchId?: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    // Owners can invite admins; admins can only invite chef/runner
    if (ctx.userRole === 'admin' && data.role === 'admin') {
      throw new Error('Admins cannot invite other admins')
    }
    if (ctx.userRole === 'admin' && data.role === 'owner') {
      throw new Error('Admins cannot invite owners')
    }

    // chef/runner invites require a branchId
    if ((data.role === 'chef' || data.role === 'runner') && !data.branchId) {
      throw new Error('A branch must be specified for chef and runner invites')
    }

    // Enforce user count tier limit
    const limits = await checkTierLimit(ctx.companyId, 'users')
    if (!limits.allowed) {
      throw new Error(
        `User limit reached (${limits.current}/${limits.max}). Upgrade your plan to invite more members.`,
      )
    }

    // Validate branch belongs to this company if provided
    if (data.branchId) {
      const [branch] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.id, data.branchId), eq(branches.companyId, ctx.companyId)))
        .limit(1)
      if (!branch) throw new Error('Branch not found')
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const [invite] = await db
      .insert(inviteTokens)
      .values({
        companyId: ctx.companyId,
        branchId: data.branchId ?? null,
        email: data.email.toLowerCase().trim(),
        role: data.role,
        token,
        expiresAt,
      })
      .returning()

    return { token: invite.token, expiresAt: invite.expiresAt }
  })

export const redeemInvite = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    const [invite] = await db
      .select()
      .from(inviteTokens)
      .where(eq(inviteTokens.token, data.token))
      .limit(1)

    if (!invite) throw new Error('Invalid invite token')
    if (invite.used) throw new Error('This invite token has already been used')
    if (invite.expiresAt < new Date()) throw new Error('This invite token has expired')

    // Optionally validate email matches
    if (invite.email && invite.email !== ctx.userEmail.toLowerCase()) {
      throw new Error('This invite was sent to a different email address')
    }

    if (invite.role === 'owner' || invite.role === 'admin') {
      await db
        .insert(companyMembers)
        .values({ companyId: invite.companyId, userId: ctx.userId, role: invite.role })
        .onConflictDoNothing()
    } else {
      if (!invite.branchId) throw new Error('Invite is missing branch assignment')
      await db
        .insert(branchMembers)
        .values({ branchId: invite.branchId, userId: ctx.userId, role: invite.role })
        .onConflictDoNothing()
    }

    await db
      .update(inviteTokens)
      .set({ used: true })
      .where(eq(inviteTokens.id, invite.id))

    // Fetch company + branch for the returned context
    const [company] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, invite.companyId))
      .limit(1)

    const defaultBranchId =
      invite.branchId ??
      (await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.companyId, invite.companyId))
        .limit(1)
        .then((r) => r[0]?.id ?? ''))

    // Update session so the root route guard sees the new company immediately
    const session = await getAppSession()
    await session.update({
      ...session.data,
      userRole: invite.role as UserRole,
      companyId: invite.companyId,
      defaultBranchId: defaultBranchId ?? '',
    })

    return {
      companyId: invite.companyId,
      companyName: company?.name ?? '',
      defaultBranchId,
      role: invite.role,
    }
  })

export const removeMember = createServerFn({ method: 'POST' })
  .inputValidator((data: { memberId: string; level: 'company' | 'branch' }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    if (data.level === 'company') {
      // Prevent removing yourself
      const [member] = await db
        .select({ userId: companyMembers.userId })
        .from(companyMembers)
        .where(eq(companyMembers.id, data.memberId))
        .limit(1)
      if (member?.userId === ctx.userId) {
        throw new Error('You cannot remove yourself')
      }
      // Admin cannot remove another owner
      if (ctx.userRole === 'admin') {
        const [target] = await db
          .select({ role: companyMembers.role })
          .from(companyMembers)
          .where(eq(companyMembers.id, data.memberId))
          .limit(1)
        if (target?.role === 'owner') throw new Error('Admins cannot remove owners')
      }
      await db
        .delete(companyMembers)
        .where(
          and(
            eq(companyMembers.id, data.memberId),
            eq(companyMembers.companyId, ctx.companyId),
          ),
        )
    } else {
      // Verify the branch belongs to this company before deleting
      const companyBranchIds = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.companyId, ctx.companyId))
      const branchIds = companyBranchIds.map((b) => b.id)

      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm')
        await db
          .delete(branchMembers)
          .where(
            and(
              eq(branchMembers.id, data.memberId),
              inArray(branchMembers.branchId, branchIds),
            ),
          )
      }
    }

    return { success: true }
  })

export const getPendingInvites = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await getAuthContext()
  requireRole(ctx, 'owner', 'admin')

  const rows = await db
    .select({
      id: inviteTokens.id,
      email: inviteTokens.email,
      role: inviteTokens.role,
      branchId: inviteTokens.branchId,
      token: inviteTokens.token,
      expiresAt: inviteTokens.expiresAt,
      createdAt: inviteTokens.createdAt,
      branchName: branches.name,
    })
    .from(inviteTokens)
    .leftJoin(branches, eq(inviteTokens.branchId, branches.id))
    .where(
      and(
        eq(inviteTokens.companyId, ctx.companyId),
        eq(inviteTokens.used, false),
      ),
    )
    .orderBy(inviteTokens.createdAt)

  const now = new Date()
  return rows.filter((r) => r.expiresAt > now)
})
