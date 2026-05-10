import { createServerFn } from '@tanstack/react-start'
import { db, stations } from '@/db'
import { eq, and } from 'drizzle-orm'
import { getAuthContext, requireRole } from '@/server/auth/context'
import { checkTierLimit } from '@/server/tier-check'

export const getStations = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }) => {
    await getAuthContext()
    return db
      .select()
      .from(stations)
      .where(eq(stations.branchId, branchId))
      .orderBy(stations.name)
  })

export const createStation = createServerFn({ method: 'POST' })
  .inputValidator((data: { branchId: string; name: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const limits = await checkTierLimit(ctx.companyId, 'stations')
    if (!limits.allowed) {
      throw new Error(
        `Station limit reached (${limits.current}/${limits.max}). Upgrade your plan to add more stations.`,
      )
    }

    const [station] = await db
      .insert(stations)
      .values({ branchId: data.branchId, name: data.name.trim() })
      .returning()
    return station
  })

export const deleteStation = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; branchId: string }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    await db
      .delete(stations)
      .where(and(eq(stations.id, data.id), eq(stations.branchId, data.branchId)))
    return { success: true }
  })
