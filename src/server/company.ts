import { createServerFn } from '@tanstack/react-start'
import {
  db,
  companies,
  branches,
  companyMembers,
  branchMembers,
  products,
  stations,
} from '@/db'
import { eq, and, count } from 'drizzle-orm'
import { getAuthContext, requireRole } from '@/server/auth/context'
import { getAppSession } from '@/server/auth/session'
import { checkTierLimit } from '@/server/tier-check'
import { getTierLimits } from '@/lib/tier-limits'
import type { TierUsage } from '@/types'

export const getCompany = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await getAuthContext()

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, ctx.companyId))
    .limit(1)

  return company ?? null
})

export const getCompanyBranches = createServerFn({ method: 'GET' }).handler(async () => {
  const ctx = await getAuthContext()

  return db
    .select()
    .from(branches)
    .where(eq(branches.companyId, ctx.companyId))
    .orderBy(branches.name)
})

export const createCompany = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; bio?: string; branchName?: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()

    const [company] = await db
      .insert(companies)
      .values({ name: data.name.trim(), bio: data.bio?.trim() ?? null })
      .returning()

    const [branch] = await db
      .insert(branches)
      .values({ companyId: company.id, name: data.branchName?.trim() ?? 'Main Branch' })
      .returning()

    await db
      .insert(companyMembers)
      .values({ companyId: company.id, userId: ctx.userId, role: 'owner' })

    // Update session so the root route guard sees the new company immediately
    const session = await getAppSession()
    await session.update({
      userId: ctx.userId,
      userName: session.data.userName,
      userEmail: session.data.userEmail,
      userRole: 'owner',
      companyId: company.id,
      defaultBranchId: branch.id,
    })

    return { company, branch }
  })

export const createBranch = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const limits = await checkTierLimit(ctx.companyId, 'branches')
    if (!limits.allowed) {
      throw new Error(
        `Branch limit reached (${limits.current}/${limits.max}). Upgrade your plan to add more branches.`,
      )
    }

    const [branch] = await db
      .insert(branches)
      .values({ companyId: ctx.companyId, name: data.name.trim() })
      .returning()

    return branch
  })

export const updateBranch = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; name: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [updated] = await db
      .update(branches)
      .set({ name: data.name.trim() })
      .where(and(eq(branches.id, data.id), eq(branches.companyId, ctx.companyId)))
      .returning()

    return updated
  })

export const updateCompany = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; bio?: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner')

    const [updated] = await db
      .update(companies)
      .set({ name: data.name.trim(), bio: data.bio?.trim() ?? null })
      .where(eq(companies.id, ctx.companyId))
      .returning()

    return updated
  })

export const getTierUsage = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TierUsage> => {
    const ctx = await getAuthContext()

    const [company] = await db
      .select({ tier: companies.tier })
      .from(companies)
      .where(eq(companies.id, ctx.companyId))
      .limit(1)

    const tier = company?.tier ?? 'starter'
    const limits = getTierLimits(tier)

    const [branchCount] = await db
      .select({ count: count() })
      .from(branches)
      .where(eq(branches.companyId, ctx.companyId))

    const companyUserCount = await db
      .select({ count: count() })
      .from(companyMembers)
      .where(eq(companyMembers.companyId, ctx.companyId))

    const companyBranchIds = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.companyId, ctx.companyId))
    const branchIds = companyBranchIds.map((b) => b.id)

    let branchUserCount = 0
    let stationCount = 0
    let productCount = 0

    if (branchIds.length > 0) {
      const { inArray } = await import('drizzle-orm')

      const [bmCount] = await db
        .select({ count: count() })
        .from(branchMembers)
        .where(inArray(branchMembers.branchId, branchIds))
      branchUserCount = bmCount?.count ?? 0

      const [stCount] = await db
        .select({ count: count() })
        .from(stations)
        .where(inArray(stations.branchId, branchIds))
      stationCount = stCount?.count ?? 0

      const [prodCount] = await db
        .select({ count: count() })
        .from(products)
        .where(inArray(products.branchId, branchIds))
      productCount = prodCount?.count ?? 0
    }

    const totalUsers = (companyUserCount[0]?.count ?? 0) + branchUserCount

    return {
      tier,
      usage: {
        branches: branchCount?.count ?? 0,
        users: totalUsers,
        stations: stationCount,
        products: productCount,
      },
      limits,
    }
  },
)

