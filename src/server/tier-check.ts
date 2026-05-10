import { db, companies, branches, companyMembers, branchMembers, stations, products } from '@/db'
import { eq, count } from 'drizzle-orm'
import { getTierLimits } from '@/lib/tier-limits'

/**
 * Checks whether the company has room for one more of the given resource
 * under its current tier limits.
 *
 * This is a plain server-only helper — it must only be called from inside
 * createServerFn handlers so TanStack Start keeps it out of the client bundle.
 */
export async function checkTierLimit(
  companyId: string,
  resource: 'branches' | 'users' | 'stations' | 'products',
): Promise<{ allowed: boolean; current: number; max: number }> {
  const { inArray } = await import('drizzle-orm')

  const [company] = await db
    .select({ tier: companies.tier })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  const tier = company?.tier ?? 'starter'
  const limits = getTierLimits(tier)
  const max = limits[resource]

  const companyBranchIds = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.companyId, companyId))
  const branchIds = companyBranchIds.map((b) => b.id)

  let current = 0

  if (resource === 'branches') {
    current = branchIds.length
  } else if (resource === 'users') {
    const [cmCount] = await db
      .select({ count: count() })
      .from(companyMembers)
      .where(eq(companyMembers.companyId, companyId))
    let bmCount = 0
    if (branchIds.length > 0) {
      const [bm] = await db
        .select({ count: count() })
        .from(branchMembers)
        .where(inArray(branchMembers.branchId, branchIds))
      bmCount = bm?.count ?? 0
    }
    current = (cmCount?.count ?? 0) + bmCount
  } else if (resource === 'stations') {
    if (branchIds.length > 0) {
      const [st] = await db
        .select({ count: count() })
        .from(stations)
        .where(inArray(stations.branchId, branchIds))
      current = st?.count ?? 0
    }
  } else if (resource === 'products') {
    if (branchIds.length > 0) {
      const [pr] = await db
        .select({ count: count() })
        .from(products)
        .where(inArray(products.branchId, branchIds))
      current = pr?.count ?? 0
    }
  }

  return { allowed: current < max, current, max }
}
