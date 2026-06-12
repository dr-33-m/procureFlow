import { createServerFn } from '@tanstack/react-start'
import {
  db,
  kitchenStock,
  kitchenReconciliations,
  kitchenReconciliationItems,
  inventoryTransactions,
  products,
  menus,
  users,
} from '@/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { getAuthContext, requireRole, validateBranchAccess } from '@/server/auth/context'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'event'
type ReconReason =
  | 'normal'
  | 'reorder-uplift'
  | 'expiry-driven'
  | 'substitution'
  | 'menu-change'
  | 'waste-spoilage'
  | 'waste-overcook'
  | 'training'
  | 'other'

// ─── Reads ──────────────────────────────────────────────────────────────────

export const listKitchenStock = createServerFn({ method: 'GET' })
  .inputValidator(
    (params: {
      branchId: string
      status?: 'pending' | 'partial' | 'reconciled' | 'all'
    }) => params,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await validateBranchAccess(ctx, data.branchId)

    const status = data.status ?? 'pending'

    const conditions = [eq(kitchenStock.branchId, data.branchId)]
    if (status !== 'all') {
      conditions.push(eq(kitchenStock.status, status))
    }

    const rows = await db
      .select({
        id: kitchenStock.id,
        productId: kitchenStock.productId,
        productName: products.name,
        productCategory: products.category,
        stockUnit: products.stockUnit,
        baseUnit: products.baseUnit,
        quantityIssued: kitchenStock.quantityIssued,
        quantityRemaining: kitchenStock.quantityRemaining,
        expectedGuestCount: kitchenStock.expectedGuestCount,
        expectedServings: kitchenStock.expectedServings,
        menuId: kitchenStock.menuId,
        menuName: menus.name,
        menuMealType: menus.mealType,
        eventTag: kitchenStock.eventTag,
        status: kitchenStock.status,
        issuedAt: kitchenStock.issuedAt,
        reconciledAt: kitchenStock.reconciledAt,
        notes: kitchenStock.notes,
        createdBy: kitchenStock.createdBy,
      })
      .from(kitchenStock)
      .leftJoin(products, eq(kitchenStock.productId, products.id))
      .leftJoin(menus, eq(kitchenStock.menuId, menus.id))
      .where(and(...conditions))
      .orderBy(desc(kitchenStock.issuedAt))

    return rows
  })

export const getReconciliationHistory = createServerFn({ method: 'GET' })
  .inputValidator((params: { branchId: string; limit?: number }) => params)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await validateBranchAccess(ctx, data.branchId)

    const limit = data.limit ?? 10

    const parents = await db
      .select({
        id: kitchenReconciliations.id,
        serviceDate: kitchenReconciliations.serviceDate,
        mealType: kitchenReconciliations.mealType,
        eventTag: kitchenReconciliations.eventTag,
        actualGuestCount: kitchenReconciliations.actualGuestCount,
        actualServings: kitchenReconciliations.actualServings,
        reorderRatio: kitchenReconciliations.reorderRatio,
        notes: kitchenReconciliations.notes,
        reportedAt: kitchenReconciliations.reportedAt,
        createdByName: users.name,
      })
      .from(kitchenReconciliations)
      .leftJoin(users, eq(kitchenReconciliations.createdBy, users.id))
      .where(eq(kitchenReconciliations.branchId, data.branchId))
      .orderBy(desc(kitchenReconciliations.reportedAt))
      .limit(limit)

    if (parents.length === 0) return []

    const itemRows = await db
      .select({
        id: kitchenReconciliationItems.id,
        reconciliationId: kitchenReconciliationItems.reconciliationId,
        productId: kitchenReconciliationItems.productId,
        productName: products.name,
        stockUnit: products.stockUnit,
        quantityUsed: kitchenReconciliationItems.quantityUsed,
        quantityWaste: kitchenReconciliationItems.quantityWaste,
        quantityLeftover: kitchenReconciliationItems.quantityLeftover,
        reason: kitchenReconciliationItems.reason,
        reasonNotes: kitchenReconciliationItems.reasonNotes,
      })
      .from(kitchenReconciliationItems)
      .leftJoin(products, eq(kitchenReconciliationItems.productId, products.id))
      .where(
        inArray(
          kitchenReconciliationItems.reconciliationId,
          parents.map((p) => p.id),
        ),
      )

    const byParent = new Map<string, typeof itemRows>()
    for (const i of itemRows) {
      if (!byParent.has(i.reconciliationId)) byParent.set(i.reconciliationId, [])
      byParent.get(i.reconciliationId)!.push(i)
    }

    return parents.map((p) => ({ ...p, items: byParent.get(p.id) ?? [] }))
  })

// ─── The write ──────────────────────────────────────────────────────────────

// One transaction-worth of writes: parent + children + RECONCILE
// inventoryTransactions rows + kitchen_stock status flips. Chef-only for
// branch members; owner/admin can do it for any branch they manage.
export const recordReconciliation = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      serviceDate: string // 'YYYY-MM-DD'
      mealType: MealType
      eventTag?: string | null
      actualGuestCount: number
      actualServings: number
      notes?: string | null
      items: Array<{
        kitchenStockId: string
        productId: string
        quantityUsed: number
        quantityWaste?: number
        quantityLeftover?: number
        reason: ReconReason
        reasonNotes?: string | null
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin', 'chef')
    await validateBranchAccess(ctx, data.branchId)

    if (data.items.length === 0) {
      throw new Error('At least one product is required to reconcile.')
    }
    if (data.actualGuestCount <= 0) {
      throw new Error('actualGuestCount must be > 0.')
    }
    if (data.actualServings <= 0) {
      throw new Error('actualServings must be > 0.')
    }

    const reorderRatio = data.actualServings / data.actualGuestCount

    const [parent] = await db
      .insert(kitchenReconciliations)
      .values({
        branchId: data.branchId,
        serviceDate: data.serviceDate,
        mealType: data.mealType,
        eventTag: data.eventTag?.trim() || null,
        actualGuestCount: data.actualGuestCount,
        actualServings: data.actualServings,
        reorderRatio: reorderRatio.toFixed(3),
        notes: data.notes?.trim() || null,
        createdBy: ctx.userId,
      })
      .returning()

    // Look up the source kitchen_stock rows for branch verification and
    // for getting productId fallback (in case the client passed a stale id).
    const stockRows = await db
      .select()
      .from(kitchenStock)
      .where(
        inArray(
          kitchenStock.id,
          data.items.map((i) => i.kitchenStockId).filter(Boolean) as string[],
        ),
      )
    const stockById = new Map(stockRows.map((s) => [s.id, s]))

    // Build batch arrays for reconciliation items and transactions
    const reconItemValues: Array<Record<string, unknown>> = []
    const txnValues: Array<Record<string, unknown>> = []
    const stockUpdates: Array<{ id: string; status: string; remaining: string }> = []

    for (const item of data.items) {
      const sourceStock = stockById.get(item.kitchenStockId)
      // Defensive: skip items where the kitchen_stock row doesn't belong to
      // this branch (shouldn't happen from a well-behaved client, but a
      // misbehaved one could send arbitrary ids).
      if (sourceStock && sourceStock.branchId !== data.branchId) continue

      const productId = sourceStock?.productId ?? item.productId
      if (!productId) continue

      const perGuestUsedStock = item.quantityUsed / data.actualGuestCount
      const perServingUsedStock = item.quantityUsed / data.actualServings

      reconItemValues.push({
        reconciliationId: parent.id,
        kitchenStockId: item.kitchenStockId || null,
        productId,
        quantityUsed: item.quantityUsed.toString(),
        quantityWaste: (item.quantityWaste ?? 0).toString(),
        quantityLeftover: (item.quantityLeftover ?? 0).toString(),
        reason: item.reason,
        reasonNotes: item.reasonNotes?.trim() || null,
        perGuestUsedStock: perGuestUsedStock.toFixed(6),
        perServingUsedStock: perServingUsedStock.toFixed(6),
      })

      // Mirror RECONCILE rows into inventory_transactions so the consumption
      // query in shopping-lists.ts (and any other reader) sees them through
      // the existing audit path.
      txnValues.push({
        branchId: data.branchId,
        productId,
        type: 'RECONCILE',
        quantityStock: item.quantityUsed.toString(),
        unitAtEntry: 'stock',
        guestCount: data.actualGuestCount,
        referenceId: parent.id,
        referenceType: 'kitchen_reconciliation',
        method: 'reconciliation',
        createdBy: ctx.userId,
      })

      // Flip the source kitchen_stock row status
      if (item.kitchenStockId && sourceStock) {
        const totalAccounted =
          item.quantityUsed + (item.quantityWaste ?? 0) + (item.quantityLeftover ?? 0)
        const issued = parseFloat(sourceStock.quantityIssued)
        const newStatus = totalAccounted >= issued * 0.99 ? 'reconciled' : 'partial'
        const newRemaining = Math.max(0, issued - totalAccounted)
        stockUpdates.push({
          id: item.kitchenStockId,
          status: newStatus,
          remaining: newRemaining.toString(),
        })
      }
    }

    // Batch insert reconciliation items + transactions in parallel
    if (reconItemValues.length > 0) {
      await Promise.all([
        db.insert(kitchenReconciliationItems).values(reconItemValues as never),
        db.insert(inventoryTransactions).values(txnValues as never),
      ])
    }

    // Batch update kitchen_stock statuses in parallel
    if (stockUpdates.length > 0) {
      await Promise.all(
        stockUpdates.map((u) =>
          db
            .update(kitchenStock)
            .set({
              status: u.status,
              quantityRemaining: u.remaining,
              reconciledAt: new Date(),
            })
            .where(eq(kitchenStock.id, u.id)),
        ),
      )
    }

    return { ok: true, reconciliationId: parent.id, reorderRatio }
  })
