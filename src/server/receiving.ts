import { createServerFn } from '@tanstack/react-start'
import {
  db,
  shoppingLists,
  shoppingListItems,
  products,
  inventory,
  inventoryTransactions,
  productPriceHistory,
  users,
  branchMembers,
} from '@/db'
import { eq, sql, and, count } from 'drizzle-orm'
import { pricePerStockUnit, type ProductPricing } from '@/server/lib/pricing'
import { getAuthContext, requireRole } from '@/server/auth/context'
import type { ReceivingListSummary, ReceivingListDetail } from '@/types'

async function recordPriceIfKnown(
  productId: string,
  pricePerStockUnitStr: string | null | undefined,
) {
  const price = parseFloat(pricePerStockUnitStr ?? '0')
  if (!price || price <= 0) return

  const [product] = await db
    .select({
      stockUnit: products.stockUnit,
      purchaseUnit: products.purchaseUnit,
      purchasePackSize: products.purchasePackSize,
      purchasePrice: products.purchasePrice,
      baseUnit: products.baseUnit,
      baseUnitsPerStock: products.baseUnitsPerStock,
    })
    .from(products)
    .where(eq(products.id, productId))

  if (!product) return

  const pricing: ProductPricing = {
    stockUnit: product.stockUnit,
    purchaseUnit: product.purchaseUnit,
    purchasePackSize: product.purchasePackSize,
    purchasePrice: product.purchasePrice,
    baseUnit: product.baseUnit,
    baseUnitsPerStock: product.baseUnitsPerStock,
  }

  const packSize = product.purchaseUnit
    ? parseFloat(product.purchasePackSize ?? '1') || 1
    : 1
  const newPurchasePrice = price * packSize

  const existingPrice = pricePerStockUnit(pricing)
  if (Math.abs(price - existingPrice) / Math.max(existingPrice, 0.0001) > 0.01) {
    await db
      .update(products)
      .set({ purchasePrice: newPurchasePrice.toFixed(4) })
      .where(eq(products.id, productId))
  }

  await db.insert(productPriceHistory).values({
    productId,
    pricePerStockUnit: price.toFixed(4),
    source: 'receive',
  })
}

export const getReceivingLists = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<ReceivingListSummary[]> => {
    await getAuthContext()

    const lists = await db
      .select({
        id: shoppingLists.id,
        branchId: shoppingLists.branchId,
        name: shoppingLists.name,
        priority: shoppingLists.priority,
        status: shoppingLists.status,
        totalValue: shoppingLists.totalValue,
        guestCount: shoppingLists.guestCount,
        periodType: shoppingLists.periodType,
        periodStart: shoppingLists.periodStart,
        periodEnd: shoppingLists.periodEnd,
        expectedGuestCount: shoppingLists.expectedGuestCount,
        expectedDailyOccupancy: shoppingLists.expectedDailyOccupancy,
        periodDays: shoppingLists.periodDays,
        mealsPerDayCount: shoppingLists.mealsPerDayCount,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        completedAt: shoppingLists.completedAt,
        createdBy: shoppingLists.createdBy,
        assignedTo: shoppingLists.assignedTo,
        creatorName: users.name,
      })
      .from(shoppingLists)
      .leftJoin(users, eq(shoppingLists.createdBy, users.id))
      .where(
        and(
          eq(shoppingLists.branchId, branchId),
          sql`${shoppingLists.status} IN ('in_review', 'on_hold', 'completed')`,
        ),
      )
      .orderBy(sql`${shoppingLists.updatedAt} DESC NULLS LAST`)

    const itemCounts = await db
      .select({
        shoppingListId: shoppingListItems.shoppingListId,
        total: count(),
      })
      .from(shoppingListItems)
      .groupBy(shoppingListItems.shoppingListId)
    const totalMap = Object.fromEntries(itemCounts.map((r) => [r.shoppingListId, r.total]))

    const allItems = await db
      .select({
        shoppingListId: shoppingListItems.shoppingListId,
        receivedQuantity: shoppingListItems.receivedQuantity,
      })
      .from(shoppingListItems)
    const verifiedMap: Record<string, number> = {}
    for (const item of allItems) {
      const received = parseFloat(item.receivedQuantity ?? '0')
      if (received > 0) {
        verifiedMap[item.shoppingListId] = (verifiedMap[item.shoppingListId] ?? 0) + 1
      }
    }

    // Get members for this branch to resolve runner names
    const memberRows = await db
      .select({ userId: branchMembers.userId, name: users.name })
      .from(branchMembers)
      .leftJoin(users, eq(branchMembers.userId, users.id))
      .where(eq(branchMembers.branchId, branchId))
    const memberMap = Object.fromEntries(
      memberRows.map((r) => [r.userId, r.name ?? '']),
    )

    return lists.map((l) => ({
      ...l,
      creatorName: l.creatorName ?? null,
      runnerName: l.assignedTo ? (memberMap[l.assignedTo] ?? null) : null,
      itemCount: totalMap[l.id] ?? 0,
      verifiedItems: verifiedMap[l.id] ?? 0,
    }))
  })

export const getReceivingList = createServerFn({ method: 'GET' })
  .inputValidator((data: { branchId: string; listId: string }) => data)
  .handler(async ({ data: { branchId, listId } }): Promise<ReceivingListDetail | null> => {
    await getAuthContext()

    const [list] = await db
      .select({
        id: shoppingLists.id,
        branchId: shoppingLists.branchId,
        name: shoppingLists.name,
        priority: shoppingLists.priority,
        status: shoppingLists.status,
        totalValue: shoppingLists.totalValue,
        guestCount: shoppingLists.guestCount,
        periodType: shoppingLists.periodType,
        periodStart: shoppingLists.periodStart,
        periodEnd: shoppingLists.periodEnd,
        expectedGuestCount: shoppingLists.expectedGuestCount,
        expectedDailyOccupancy: shoppingLists.expectedDailyOccupancy,
        periodDays: shoppingLists.periodDays,
        mealsPerDayCount: shoppingLists.mealsPerDayCount,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        completedAt: shoppingLists.completedAt,
        createdBy: shoppingLists.createdBy,
        assignedTo: shoppingLists.assignedTo,
        creatorName: users.name,
      })
      .from(shoppingLists)
      .leftJoin(users, eq(shoppingLists.createdBy, users.id))
      .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.branchId, branchId)))
      .limit(1)

    if (!list) return null

    const runnerRow = list.assignedTo
      ? await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, list.assignedTo))
          .then((r) => r[0])
      : null

    const items = await db
      .select({
        id: shoppingListItems.id,
        shoppingListId: shoppingListItems.shoppingListId,
        productId: shoppingListItems.productId,
        requestedQuantity: shoppingListItems.requestedQuantity,
        requestedUnit: shoppingListItems.requestedUnit,
        purchasedQuantity: shoppingListItems.purchasedQuantity,
        receivedQuantity: shoppingListItems.receivedQuantity,
        pricePerStockUnit: shoppingListItems.pricePerStockUnit,
        status: shoppingListItems.status,
        updatedBy: shoppingListItems.updatedBy,
        createdAt: shoppingListItems.createdAt,
        updatedAt: shoppingListItems.updatedAt,
        productName: products.name,
        productCategory: products.category,
        productBarcode: products.barcode,
        stockUnit: products.stockUnit,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
      })
      .from(shoppingListItems)
      .leftJoin(products, eq(shoppingListItems.productId, products.id))
      .where(eq(shoppingListItems.shoppingListId, listId))
      .orderBy(shoppingListItems.createdAt)

    const totalItems = items.length
    const verifiedItems = items.filter(
      (i) => parseFloat(i.receivedQuantity ?? '0') > 0,
    ).length

    return {
      ...list,
      creatorName: list.creatorName ?? null,
      runnerName: runnerRow?.name ?? null,
      items: items.map((i) => ({
        ...i,
        productName: i.productName ?? 'Unknown',
        productCategory: i.productCategory ?? 'General',
        productBarcode: i.productBarcode ?? null,
        stockUnit: i.stockUnit ?? '',
        purchaseUnit: i.purchaseUnit ?? null,
        purchasePackSize: i.purchasePackSize ?? null,
        purchasePrice: i.purchasePrice ?? null,
        baseUnit: i.baseUnit ?? null,
        baseUnitsPerStock: i.baseUnitsPerStock ?? null,
        suppliers: [],
      })),
      totalItems,
      verifiedItems,
    }
  })

export const scanItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { listId: string; barcode: string; increment: number }) => data)
  .handler(async ({ data }) => {
    await getAuthContext()

    const [product] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.barcode, data.barcode))
      .limit(1)

    if (!product) {
      return { success: false, error: 'Product not found for this barcode' }
    }

    const [item] = await db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.shoppingListId, data.listId),
          eq(shoppingListItems.productId, product.id),
        ),
      )
      .limit(1)

    if (!item) {
      return { success: false, error: 'Product not in this shopping list' }
    }

    const currentQty = parseFloat(item.receivedQuantity ?? '0')
    const newQty = currentQty + data.increment

    await db
      .update(shoppingListItems)
      .set({ receivedQuantity: newQty.toString(), updatedAt: new Date() })
      .where(eq(shoppingListItems.id, item.id))

    return { success: true, itemId: item.id, productName: product.name, newQuantity: newQty }
  })

export const updateReceivedQuantity = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { itemId: string; receivedQuantity: number; unit?: 'stock' | 'base' | 'purchase' }) =>
      data,
  )
  .handler(async ({ data }) => {
    await getAuthContext()
    await db
      .update(shoppingListItems)
      .set({ receivedQuantity: data.receivedQuantity.toString(), updatedAt: new Date() })
      .where(eq(shoppingListItems.id, data.itemId))
  })

export const approveItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { itemId: string; branchId: string }) => data)
  .handler(async ({ data: { itemId, branchId } }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [item] = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.id, itemId))
      .limit(1)

    if (!item || !item.productId) {
      return { success: false, error: 'Item not found or no product' }
    }

    const received = parseFloat(item.receivedQuantity ?? '0')
    const purchased = parseFloat(item.purchasedQuantity ?? '0')
    const qty = received > 0 ? received : purchased

    if (qty <= 0) {
      return { success: false, error: 'No quantity to approve' }
    }

    const productId = item.productId

    await db
      .insert(inventory)
      .values({ branchId, productId, quantity: qty.toString(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [inventory.branchId, inventory.productId],
        set: {
          quantity: sql`${inventory.quantity} + ${qty}`,
          updatedAt: new Date(),
        },
      })

    await db.insert(inventoryTransactions).values({
      branchId,
      productId,
      type: 'RECEIVE',
      quantityStock: qty.toString(),
      unitAtEntry: 'stock',
      referenceId: item.shoppingListId,
      referenceType: 'shopping_list',
      method: 'manual',
      createdBy: ctx.userId,
    })

    await recordPriceIfKnown(productId, item.pricePerStockUnit)
    return { success: true }
  })

export const approveList = createServerFn({ method: 'POST' })
  .inputValidator((data: { listId: string; branchId: string }) => data)
  .handler(async ({ data: { listId, branchId } }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, listId))

    for (const item of items) {
      if (!item.productId) continue

      const received = parseFloat(item.receivedQuantity ?? '0')
      const purchased = parseFloat(item.purchasedQuantity ?? '0')
      const qty = received > 0 ? received : purchased

      if (qty <= 0) continue

      const productId = item.productId

      await db
        .insert(inventory)
        .values({ branchId, productId, quantity: qty.toString(), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [inventory.branchId, inventory.productId],
          set: {
            quantity: sql`${inventory.quantity} + ${qty}`,
            updatedAt: new Date(),
          },
        })

      await db.insert(inventoryTransactions).values({
        branchId,
        productId,
        type: 'RECEIVE',
        quantityStock: qty.toString(),
        unitAtEntry: 'stock',
        referenceId: listId,
        referenceType: 'shopping_list',
        method: 'manual',
        createdBy: ctx.userId,
      })

      await recordPriceIfKnown(productId, item.pricePerStockUnit)
    }

    await db
      .update(shoppingLists)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.branchId, branchId)))

    return { success: true }
  })
