import { createServerFn } from '@tanstack/react-start'
import { db, inventory, shoppingLists, products, users } from '@/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { pricePerStockUnit, type ProductPricing } from '@/server/lib/pricing'
import { getAuthContext } from '@/server/auth/context'
import type { DashboardStats, RecentListActivity } from '@/types'

export const getDashboardStats = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<DashboardStats> => {
    await getAuthContext()

    const invRows = await db
      .select({ quantity: inventory.quantity })
      .from(inventory)
      .where(eq(inventory.branchId, branchId))

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

    const catRows = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.branchId, branchId))
    const totalCategories = catRows.length

    const valRows = await db
      .select({
        quantity: inventory.quantity,
        stockUnit: products.stockUnit,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.branchId, branchId))

    const totalValuation = valRows.reduce((sum, r) => {
      const qty = parseFloat(r.quantity ?? '0')
      const pricing: ProductPricing = {
        stockUnit: r.stockUnit ?? '',
        purchaseUnit: r.purchaseUnit ?? null,
        purchasePackSize: r.purchasePackSize ?? null,
        purchasePrice: r.purchasePrice ?? null,
        baseUnit: r.baseUnit ?? null,
        baseUnitsPerStock: r.baseUnitsPerStock ?? null,
      }
      return sum + qty * pricePerStockUnit(pricing)
    }, 0)

    const activeListRows = await db
      .select({ id: shoppingLists.id, totalValue: shoppingLists.totalValue })
      .from(shoppingLists)
      .where(
        and(
          eq(shoppingLists.branchId, branchId),
          inArray(shoppingLists.status, ['pending', 'shopping', 'in_review', 'on_hold']),
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
  })

export const getRecentListActivity = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<RecentListActivity[]> => {
    await getAuthContext()

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
      .where(eq(shoppingLists.branchId, branchId))
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
  })
