import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm'
import type { RecentIssuance, TodayIssuanceStats } from '@/types'
import type {ProductPricing} from '@/server/lib/pricing';
import {
  db,
  inventory,
  inventoryTransactions,
  kitchenStock,
  productBatches,
  products,
  users,
} from '@/db'
import {  toStockQty } from '@/server/lib/pricing'
import { getLearnedPerGuest } from '@/server/lib/learned-par'
import { getAuthContext, requireRole } from '@/server/auth/context'

// FIFO-decrement product_batches for a given issued quantity. Oldest
// bestBefore first; batches without a bestBefore fall to the end (we still
// consume them, but only after dated stock is gone). If total batch stock is
// short, we consume what's there — inventory.quantity is the authoritative
// total and is decremented separately via GREATEST(0, ...).
async function consumeFromBatches(
  branchId: string,
  productId: string,
  qtyToConsume: number,
): Promise<void> {
  if (qtyToConsume <= 0) return

  const batches = await db
    .select({
      id: productBatches.id,
      quantityStock: productBatches.quantityStock,
    })
    .from(productBatches)
    .where(
      and(
        eq(productBatches.branchId, branchId),
        eq(productBatches.productId, productId),
        eq(productBatches.isDepleted, false),
      ),
    )
    // bestBefore ASC NULLS LAST, then receivedAt ASC — dated stock goes first.
    .orderBy(
      sql`${productBatches.bestBefore} ASC NULLS LAST`,
      asc(productBatches.receivedAt),
    )

  let remaining = qtyToConsume
  for (const batch of batches) {
    if (remaining <= 0) break
    const available = parseFloat(batch.quantityStock)
    if (available <= 0) continue

    if (available <= remaining) {
      // Deplete this batch entirely.
      await db
        .update(productBatches)
        .set({ quantityStock: '0', isDepleted: true })
        .where(eq(productBatches.id, batch.id))
      remaining -= available
    } else {
      // Partial draw.
      await db
        .update(productBatches)
        .set({ quantityStock: (available - remaining).toString() })
        .where(eq(productBatches.id, batch.id))
      remaining = 0
    }
  }
}

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
        parPerGuestUnit: products.parPerGuestUnit,
        quantity: inventory.quantity,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
        servingUnit: products.servingUnit,
        servingSize: products.servingSize,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.branchId, branchId))
      .orderBy(products.category, products.name)

    const productIds = rows
      .map((r) => r.productId)
      .filter((id): id is string => id != null)

    const learnedRates = await getLearnedPerGuest({ branchId, productIds })
    const learnedMap = new Map(learnedRates.map((l) => [l.productId, l]))

    return rows
      .filter((r) => r.productId != null)
      .map((r) => {
        const learned = learnedMap.get(r.productId as string)
        return {
          ...r,
          productId: r.productId as string,
          name: r.name ?? 'Unknown',
          stockUnit: r.stockUnit ?? '',
          category: r.category ?? 'General',
          quantity: parseFloat(r.quantity ?? '0'),
          learnedPerGuestStock: learned?.perGuestStock ?? null,
          learnedConfidence: learned?.confidence ?? null,
          learnedSource: learned?.source ?? null,
          learnedSampleSize: learned?.sampleSize ?? 0,
        }
      })
  })

export const getRecentIssuances = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<Array<RecentIssuance>> => {
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
      // AI context (optional) — set when this issuance was proposed by the
      // issuance agent and approved in the cart. Stored on kitchen_stock rows
      // so reconciliation can segment learned rates downstream.
      menuId?: string | null
      eventTag?: string | null
      expectedServings?: number | null
      items: Array<{
        productId: string
        deductQty: number
        deductUnit: 'stock' | 'purchase'
        station: string
        basis?:
          | 'learned-rate'
          | 'menu-recipe'
          | 'expiry-driven'
          | 'manual-override'
          | 'fallback-static-par'
        lineReasoning?: string
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const { branchId, guestCount, menuId, eventTag, expectedServings, items } = data

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
          servingUnit: null,
          servingSize: null,
        })
      }
    }

    for (const item of items) {
      const pricing = packagingMap.get(item.productId)
      const stockQty =
        item.deductUnit === 'purchase' && pricing
          ? toStockQty(item.deductQty, 'purchase', pricing)
          : item.deductQty

      // 1) Decrement the aggregate inventory row.
      await db
        .update(inventory)
        .set({
          quantity: sql`GREATEST(0, ${inventory.quantity} - ${stockQty})`,
          updatedAt: new Date(),
        })
        .where(
          and(eq(inventory.branchId, branchId), eq(inventory.productId, item.productId)),
        )

      // 2) Record the canonical ISSUE transaction, capturing its id so the
      //    kitchen_stock row can link back.
      const [txn] = await db
        .insert(inventoryTransactions)
        .values({
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
        .returning({ id: inventoryTransactions.id })

      // 3) Insert kitchen_stock row — Phase 3 reconciliation operates on this.
      const reasoning = item.lineReasoning ? item.lineReasoning : null
      const notes = item.basis
        ? `basis: ${item.basis}${reasoning ? ` — ${reasoning}` : ''}`
        : null
      await db.insert(kitchenStock).values({
        branchId,
        productId: item.productId,
        quantityIssued: stockQty.toString(),
        quantityRemaining: stockQty.toString(),
        expectedGuestCount: guestCount ?? null,
        expectedServings: expectedServings ?? null,
        menuId: menuId ?? null,
        eventTag: eventTag ?? null,
        sourceTransactionId: txn?.id ?? null,
        status: 'pending',
        notes,
        createdBy: ctx.userId,
      })

      // 4) FIFO-decrement product batches so expiry views stay accurate.
      await consumeFromBatches(branchId, item.productId, stockQty)
    }

    return { success: true }
  })
