import { createServerFn } from '@tanstack/react-start'
import { db, inventory, shoppingLists, products, users } from '@/db'
import { eq, and, sql, desc } from 'drizzle-orm'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import type { DashboardStats, RecentListActivity } from '@/types'

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardStats> => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    // Total inventory rows and low/out of stock counts
    const invRows = await db
      .select({
        quantity: inventory.quantity,
      })
      .from(inventory)
      .where(eq(inventory.hotelId, hotelId))

    const totalItems = invRows.length
    const outOfStock = invRows.filter((r) => parseFloat(r.quantity ?? '0') === 0).length
    const lowStock = invRows.filter(
      (r) =>
        parseFloat(r.quantity ?? '0') > 0 &&
        parseFloat(r.quantity ?? '0') <= LOW_STOCK_THRESHOLD,
    ).length
    const inStock = totalItems - outOfStock - lowStock

    const inStockPct = totalItems ? Math.round((inStock / totalItems) * 100) : 0
    const lowStockPct = totalItems ? Math.round((lowStock / totalItems) * 100) : 0
    const outOfStockPct = totalItems ? Math.round((outOfStock / totalItems) * 100) : 0

    // Category count
    const catRows = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.hotelId, hotelId))
    const totalCategories = catRows.length

    // Valuation (sum of quantity * 10 as a rough estimate — real impl needs unit prices)
    const valRows = await db
      .select({ quantity: inventory.quantity })
      .from(inventory)
      .where(eq(inventory.hotelId, hotelId))
    const totalValuation = valRows.reduce(
      (sum, r) => sum + parseFloat(r.quantity ?? '0') * 10,
      0,
    )

    // Active lists
    const activeListRows = await db
      .select({ id: shoppingLists.id, totalValue: shoppingLists.totalValue })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.hotelId, hotelId),
          sql`${shoppingLists.status} IN ('pending', 'in_progress')`,
        ),
      )

    const activeShoppingLists = activeListRows.length
    const activeListsValue = activeListRows.reduce(
      (sum, r) => sum + parseFloat(r.totalValue ?? '0'),
      0,
    )

    return {
      totalItems,
      totalCategories,
      totalValuation,
      inStockPct,
      lowStockPct,
      outOfStockPct,
      criticalWarnings: outOfStock + lowStock,
      activeShoppingLists,
      activeListsValue,
    }
  },
)

export const getRecentListActivity = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RecentListActivity[]> => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const rows = await db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        status: shoppingLists.status,
        priority: shoppingLists.priority,
        totalValue: shoppingLists.totalValue,
        updatedAt: shoppingLists.updatedAt,
        createdAt: shoppingLists.createdAt,
        creatorName: users.name,
      })
      .from(shoppingLists)
      .leftJoin(users, eq(shoppingLists.createdBy, users.id))
      .where(eq(shoppingLists.hotelId, hotelId))
      .orderBy(desc(shoppingLists.createdAt))
      .limit(10)

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      modifiedBy: r.creatorName ?? 'Unknown',
      modifiedAt: r.updatedAt ?? r.createdAt,
      value: r.totalValue ?? '0',
      status: r.status,
      priority: r.priority,
    }))
  },
)
