import { createServerFn } from '@tanstack/react-start'
import { db, products, inventory, inventoryTransactions, users } from '@/db'
import { eq, and, sql, ilike, or, desc, gte, inArray } from 'drizzle-orm'
import { toStockQty, type ProductPricing } from '@/server/lib/pricing'
import { getAuthContext, requireRole } from '@/server/auth/context'
import type { RecentIssuance, TodayIssuanceStats } from '@/types'

export const searchProducts = createServerFn({ method: 'GET' })
  .inputValidator((data: { branchId: string; query: string }) => data)
  .handler(async ({ data: { branchId, query } }) => {
    await getAuthContext()
    if (!query || query.length < 2) return []

    return db
      .select({
        id: products.id,
        name: products.name,
        stockUnit: products.stockUnit,
        barcode: products.barcode,
        quantity: inventory.quantity,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(eq(inventory.productId, products.id), eq(inventory.branchId, branchId)),
      )
      .where(
        and(
          eq(products.branchId, branchId),
          or(ilike(products.name, `%${query}%`), ilike(products.barcode, `%${query}%`)),
        ),
      )
      .limit(10)
  })

export const getInventoryForIssuance = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }) => {
    await getAuthContext()

    const rows = await db
      .select({
        id: inventory.id,
        productId: products.id,
        name: products.name,
        stockUnit: products.stockUnit,
        category: products.category,
        barcode: products.barcode,
        parPerGuest: products.parPerGuest,
        quantity: inventory.quantity,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.branchId, branchId))
      .orderBy(products.category, products.name)

    return rows
      .filter((r) => r.productId != null)
      .map((r) => ({
        ...r,
        productId: r.productId as string,
        name: r.name ?? 'Unknown',
        stockUnit: r.stockUnit ?? '',
        category: r.category ?? 'General',
        quantity: parseFloat(r.quantity ?? '0'),
      }))
  })

export const getRecentIssuances = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<RecentIssuance[]> => {
    await getAuthContext()

    const rows = await db
      .select({
        id: inventoryTransactions.id,
        quantityStock: inventoryTransactions.quantityStock,
        method: inventoryTransactions.method,
        station: inventoryTransactions.station,
        createdAt: inventoryTransactions.createdAt,
        productName: products.name,
        stockUnit: products.stockUnit,
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .where(
        and(
          eq(inventoryTransactions.branchId, branchId),
          eq(inventoryTransactions.type, 'ISSUE'),
        ),
      )
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(20)

    return rows.map((r) => ({
      id: r.id,
      productName: r.productName ?? 'Unknown',
      stockUnit: r.stockUnit ?? '',
      station: r.station,
      createdAt: r.createdAt,
      quantityStock: r.quantityStock,
      method: r.method,
    }))
  })

export const getTodayIssuanceStats = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<TodayIssuanceStats> => {
    await getAuthContext()

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const rows = await db
      .select({
        createdAt: inventoryTransactions.createdAt,
        quantityStock: inventoryTransactions.quantityStock,
      })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.branchId, branchId),
          eq(inventoryTransactions.type, 'ISSUE'),
          gte(inventoryTransactions.createdAt, yesterdayStart),
        ),
      )

    const todayRows = rows.filter((r) => r.createdAt >= todayStart)
    const yesterdayRows = rows.filter(
      (r) => r.createdAt >= yesterdayStart && r.createdAt < todayStart,
    )

    const todayCount = todayRows.reduce(
      (sum, r) => sum + Math.abs(parseFloat(r.quantityStock ?? '0')),
      0,
    )
    const yesterdayCount = yesterdayRows.reduce(
      (sum, r) => sum + Math.abs(parseFloat(r.quantityStock ?? '0')),
      0,
    )
    const deltaPercent =
      yesterdayCount > 0
        ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
        : 0

    return { todayCount, yesterdayCount, deltaPercent }
  })

export const getAllIssuances = createServerFn({ method: 'GET' })
  .inputValidator((params: { branchId: string; page: number; pageSize: number }) => params)
  .handler(async ({ data: { branchId, page, pageSize } }) => {
    await getAuthContext()
    const offset = (page - 1) * pageSize

    const allRows = await db
      .select({
        id: inventoryTransactions.id,
        quantityStock: inventoryTransactions.quantityStock,
        method: inventoryTransactions.method,
        station: inventoryTransactions.station,
        createdAt: inventoryTransactions.createdAt,
        productName: products.name,
        stockUnit: products.stockUnit,
        issuedBy: users.name,
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .leftJoin(users, eq(inventoryTransactions.createdBy, users.id))
      .where(
        and(
          eq(inventoryTransactions.branchId, branchId),
          eq(inventoryTransactions.type, 'ISSUE'),
        ),
      )
      .orderBy(desc(inventoryTransactions.createdAt))

    const total = allRows.length
    const paginated = allRows.slice(offset, offset + pageSize)

    return {
      items: paginated.map((r) => ({
        id: r.id,
        productName: r.productName ?? 'Unknown',
        stockUnit: r.stockUnit ?? '',
        station: r.station,
        createdAt: r.createdAt,
        quantityStock: r.quantityStock,
        method: r.method,
        issuedBy: r.issuedBy ?? 'System',
      })),
      total,
      page,
      pageSize,
    }
  })

export const issueStock = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      guestCount?: number | null
      items: Array<{
        productId: string
        deductQty: number
        deductUnit: 'stock' | 'purchase'
        station: string
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const { branchId, guestCount, items } = data

    const purchaseItems = items.filter((i) => i.deductUnit === 'purchase')
    const packagingMap = new Map<string, ProductPricing>()
    if (purchaseItems.length > 0) {
      const rows = await db
        .select({
          id: products.id,
          stockUnit: products.stockUnit,
          purchaseUnit: products.purchaseUnit,
          purchasePackSize: products.purchasePackSize,
          purchasePrice: products.purchasePrice,
          baseUnit: products.baseUnit,
          baseUnitsPerStock: products.baseUnitsPerStock,
        })
        .from(products)
        .where(
          and(
            eq(products.branchId, branchId),
            inArray(products.id, purchaseItems.map((i) => i.productId)),
          ),
        )
      for (const r of rows) {
        packagingMap.set(r.id, {
          stockUnit: r.stockUnit,
          purchaseUnit: r.purchaseUnit,
          purchasePackSize: r.purchasePackSize,
          purchasePrice: r.purchasePrice,
          baseUnit: r.baseUnit,
          baseUnitsPerStock: r.baseUnitsPerStock,
        })
      }
    }

    for (const item of items) {
      const pricing = packagingMap.get(item.productId)
      const stockQty =
        item.deductUnit === 'purchase' && pricing
          ? toStockQty(item.deductQty, 'purchase', pricing)
          : item.deductQty

      await db
        .update(inventory)
        .set({
          quantity: sql`GREATEST(0, ${inventory.quantity} - ${stockQty})`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(inventory.branchId, branchId), eq(inventory.productId, item.productId)),
        )

      await db.insert(inventoryTransactions).values({
        branchId,
        productId: item.productId,
        type: 'ISSUE',
        quantityStock: (-stockQty).toString(),
        unitAtEntry: item.deductUnit,
        guestCount: guestCount ?? null,
        method: 'manual',
        station: item.station,
        createdBy: ctx.userId,
      })
    }

    return { success: true }
  })
