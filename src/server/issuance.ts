import { createServerFn } from '@tanstack/react-start'
import { db, products, inventory, inventoryTransactions } from '@/db'
import { eq, and, sql, ilike, or, desc, gte } from 'drizzle-orm'
import type { RecentIssuance, TodayIssuanceStats } from '@/types'

export const searchProducts = createServerFn({ method: 'GET' })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    if (!query || query.length < 2) return []

    return db
      .select({
        id: products.id,
        name: products.name,
        unit: products.unit,
        barcode: products.barcode,
        quantity: inventory.quantity,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(
          eq(inventory.productId, products.id),
          eq(inventory.hotelId, hotelId),
        ),
      )
      .where(
        and(
          eq(products.hotelId, hotelId),
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.barcode, `%${query}%`),
          ),
        ),
      )
      .limit(10)
  })

export const getRecentIssuances = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RecentIssuance[]> => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const rows = await db
      .select({
        id: inventoryTransactions.id,
        quantity: inventoryTransactions.quantity,
        method: inventoryTransactions.method,
        station: inventoryTransactions.station,
        createdAt: inventoryTransactions.createdAt,
        productName: products.name,
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .where(
        and(
          eq(inventoryTransactions.hotelId, hotelId),
          eq(inventoryTransactions.type, 'ISSUE'),
        ),
      )
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(20)

    return rows.map((r) => ({
      id: r.id,
      productName: r.productName ?? 'Unknown',
      station: r.station,
      createdAt: r.createdAt,
      quantity: r.quantity,
      method: r.method,
    }))
  },
)

export const getTodayIssuanceStats = createServerFn({
  method: 'GET',
}).handler(async (): Promise<TodayIssuanceStats> => {
  const hotelId = process.env.MOCK_HOTEL_ID!

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const rows = await db
    .select({
      createdAt: inventoryTransactions.createdAt,
      quantity: inventoryTransactions.quantity,
    })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.hotelId, hotelId),
        eq(inventoryTransactions.type, 'ISSUE'),
        gte(inventoryTransactions.createdAt, yesterdayStart),
      ),
    )

  const todayRows = rows.filter((r) => r.createdAt >= todayStart)
  const yesterdayRows = rows.filter(
    (r) => r.createdAt >= yesterdayStart && r.createdAt < todayStart,
  )

  const todayCount = todayRows.reduce(
    (sum, r) => sum + Math.abs(parseFloat(r.quantity ?? '0')),
    0,
  )
  const yesterdayCount = yesterdayRows.reduce(
    (sum, r) => sum + Math.abs(parseFloat(r.quantity ?? '0')),
    0,
  )
  const deltaPercent =
    yesterdayCount > 0
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : 0

  return { todayCount, yesterdayCount, deltaPercent }
})

export const issueStock = createServerFn({ method: 'POST' })
  .inputValidator(
    (items: Array<{ productId: string; deductQty: number; station: string }>) =>
      items,
  )
  .handler(async ({ data: items }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const userId = process.env.MOCK_USER_ID

    for (const item of items) {
      const qty = item.deductQty

      await db
        .update(inventory)
        .set({
          quantity: sql`GREATEST(0, ${inventory.quantity} - ${qty})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventory.hotelId, hotelId),
            eq(inventory.productId, item.productId),
          ),
        )

      await db.insert(inventoryTransactions).values({
        hotelId,
        productId: item.productId,
        type: 'ISSUE',
        quantity: (-qty).toString(),
        method: 'manual',
        station: item.station,
        createdBy: userId || undefined,
      })
    }

    return { success: true }
  })
