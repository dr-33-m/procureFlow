import { createServerFn } from '@tanstack/react-start'
import {
  db,
  shoppingLists,
  shoppingListItems,
  users,
  products,
  inventory,
  productSuppliers,
  inventoryTransactions,
} from '@/db'
import { eq, and, desc, count, inArray, sql, isNotNull, gte } from 'drizzle-orm'
import { pricePerStockUnit, purchasePackSizeOrOne, type ProductPricing } from '@/server/lib/pricing'
import type { ProductSupplier, RestockSuggestion } from '@/types'

const LOOKBACK_DAYS: Record<string, number> = {
  weekly: 60,
  biweekly: 90,
  monthly: 180,
  event: 90,
}
const DEFAULT_LOOKBACK = 90
const HOTEL_DEFAULT_LEAD_TIME = 3
const Z_95 = 1.65

export const updateShoppingListStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; status: string }) => data)
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    await db
      .update(shoppingLists)
      .set({ status: data.status, updatedAt: new Date() })
      .where(and(eq(shoppingLists.id, data.id), eq(shoppingLists.hotelId, hotelId)))

    return { success: true }
  })
import type { ShoppingListWithDetails, ShoppingListDetail, ProductWithStock } from '@/types'

export const getShoppingLists = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ShoppingListWithDetails[]> => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const rows = await db
      .select({
        id: shoppingLists.id,
        hotelId: shoppingLists.hotelId,
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
      .where(eq(shoppingLists.hotelId, hotelId))
      .orderBy(desc(shoppingLists.createdAt))

    const itemCounts = await db
      .select({ shoppingListId: shoppingListItems.shoppingListId, count: count() })
      .from(shoppingListItems)
      .groupBy(shoppingListItems.shoppingListId)
    const countMap = Object.fromEntries(
      itemCounts.map((r) => [r.shoppingListId, r.count]),
    )

    const runnerRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.hotelId, hotelId))
    const runnerMap = Object.fromEntries(runnerRows.map((r) => [r.id, r.name]))

    return rows.map((r) => ({
      ...r,
      creatorName: r.creatorName,
      runnerName: r.assignedTo ? (runnerMap[r.assignedTo] ?? null) : null,
      itemCount: countMap[r.id] ?? 0,
    }))
  },
)

export const getShoppingList = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<ShoppingListDetail | null> => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const [list] = await db
      .select({
        id: shoppingLists.id,
        hotelId: shoppingLists.hotelId,
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
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.hotelId, hotelId)))

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
      .where(eq(shoppingListItems.shoppingListId, id))

    const productIds = items.map((i) => i.productId).filter((pid): pid is string => !!pid)
    const supplierRows =
      productIds.length > 0
        ? await db
            .select()
            .from(productSuppliers)
            .where(inArray(productSuppliers.productId, productIds))
        : []
    const suppliersByProduct = supplierRows.reduce<Record<string, ProductSupplier[]>>((acc, s) => {
      if (!acc[s.productId]) acc[s.productId] = []
      acc[s.productId].push(s)
      return acc
    }, {})

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
        suppliers: suppliersByProduct[i.productId ?? ''] ?? [],
      })),
    }
  })

export const deleteShoppingList = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const [list] = await db
      .select({ status: shoppingLists.status })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.hotelId, hotelId)))

    if (!list || list.status !== 'draft') {
      throw new Error('Only draft lists can be deleted')
    }

    await db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, id))
    await db.delete(shoppingLists).where(eq(shoppingLists.id, id))

    return { success: true }
  })

export const updateShoppingListItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      purchasedQuantity: number
      status: string
      pricePerStockUnit: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(shoppingListItems)
      .set({
        purchasedQuantity: data.purchasedQuantity.toString(),
        status: data.status,
        pricePerStockUnit: data.pricePerStockUnit.toString(),
        updatedAt: new Date(),
      })
      .where(eq(shoppingListItems.id, data.id))
      .returning()
    return updated
  })

export const getRunners = createServerFn({ method: 'GET' }).handler(async () => {
  const hotelId = process.env.MOCK_HOTEL_ID!
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.hotelId, hotelId), eq(users.role, 'runner')))
})

export const getProductCatalog = createServerFn({ method: 'GET' }).handler(
  async () => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    return db
      .select({
        id: products.id,
        name: products.name,
        stockUnit: products.stockUnit,
        category: products.category,
        parPerGuest: products.parPerGuest,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
      })
      .from(products)
      .where(eq(products.hotelId, hotelId))
      .orderBy(products.name)
  },
)

export const getProductsWithStock = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ProductWithStock[]> => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        stockUnit: products.stockUnit,
        category: products.category,
        parPerGuest: products.parPerGuest,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
        currentStock: inventory.quantity,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(eq(inventory.productId, products.id), eq(inventory.hotelId, hotelId)),
      )
      .where(eq(products.hotelId, hotelId))
      .orderBy(products.name)

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      stockUnit: r.stockUnit,
      category: r.category,
      parPerGuest: r.parPerGuest ?? null,
      purchaseUnit: r.purchaseUnit ?? null,
      purchasePackSize: r.purchasePackSize ?? null,
      purchasePrice: r.purchasePrice ?? null,
      baseUnit: r.baseUnit ?? null,
      baseUnitsPerStock: r.baseUnitsPerStock ?? null,
      currentStock: parseFloat(r.currentStock ?? '0'),
    }))
  },
)

export const createShoppingList = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      name: string
      assignedTo: string | null
      priority: string
      status?: string
      guestCount?: number
      periodType?: string
      periodStart?: string
      periodEnd?: string
      expectedGuestCount?: number
      expectedDailyOccupancy?: number
      periodDays?: number
      mealsPerDayCount?: number
      items: Array<{
        productId: string
        requestedQuantity: number
        pricePerStockUnit: number
        requestedUnit?: 'stock' | 'purchase'
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const userId = process.env.MOCK_USER_ID

    const totalValue = data.items.reduce(
      (sum, item) => sum + item.requestedQuantity * item.pricePerStockUnit,
      0,
    )

    const [list] = await db
      .insert(shoppingLists)
      .values({
        hotelId,
        name: data.name,
        priority: data.priority,
        createdBy: userId || undefined,
        assignedTo: data.assignedTo ?? undefined,
        status: data.status ?? 'pending',
        totalValue: totalValue.toFixed(2),
        guestCount: data.guestCount ?? null,
        periodType: data.periodType ?? null,
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
        expectedGuestCount: data.expectedGuestCount ?? null,
        expectedDailyOccupancy: data.expectedDailyOccupancy ?? null,
        periodDays: data.periodDays ?? null,
        mealsPerDayCount: data.mealsPerDayCount ?? 1,
      })
      .returning()

    if (data.items.length > 0) {
      await db.insert(shoppingListItems).values(
        data.items.map((item) => ({
          shoppingListId: list.id,
          productId: item.productId,
          requestedQuantity: item.requestedQuantity.toString(),
          pricePerStockUnit: item.pricePerStockUnit.toString(),
          requestedUnit: item.requestedUnit ?? 'stock',
          status: 'pending',
        })),
      )
    }

    return list
  })

export const updateShoppingList = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      name: string
      assignedTo: string | null
      priority: string
      status: string
      expectedGuestCount?: number
      expectedDailyOccupancy?: number
      periodType?: string
      periodDays?: number
      mealsPerDayCount?: number
      items: Array<{
        productId: string
        requestedQuantity: number
        pricePerStockUnit: number
        requestedUnit?: 'stock' | 'purchase'
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const [existing] = await db
      .select({ status: shoppingLists.status })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, data.id), eq(shoppingLists.hotelId, hotelId)))

    if (!existing || existing.status !== 'draft') {
      throw new Error('Only draft lists can be edited')
    }

    const totalValue = data.items.reduce(
      (sum, item) => sum + item.requestedQuantity * item.pricePerStockUnit,
      0,
    )

    await db
      .update(shoppingLists)
      .set({
        name: data.name,
        assignedTo: data.assignedTo ?? undefined,
        priority: data.priority,
        status: data.status,
        totalValue: totalValue.toFixed(2),
        expectedGuestCount: data.expectedGuestCount ?? null,
        expectedDailyOccupancy: data.expectedDailyOccupancy ?? null,
        periodType: data.periodType ?? null,
        periodDays: data.periodDays ?? null,
        mealsPerDayCount: data.mealsPerDayCount ?? 1,
        updatedAt: new Date(),
      })
      .where(and(eq(shoppingLists.id, data.id), eq(shoppingLists.hotelId, hotelId)))

    await db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, data.id))

    if (data.items.length > 0) {
      await db.insert(shoppingListItems).values(
        data.items.map((item) => ({
          shoppingListId: data.id,
          productId: item.productId,
          requestedQuantity: item.requestedQuantity.toString(),
          pricePerStockUnit: item.pricePerStockUnit.toString(),
          requestedUnit: item.requestedUnit ?? 'stock',
          status: 'pending',
        })),
      )
    }

    return { success: true }
  })

// ─── Restock Suggestions ─────────────────────────────────────────────────────

async function computeRestockSuggestions(
  hotelId: string,
  expectedGuestCount: number,
  periodDays: number,
  periodType?: string,
): Promise<RestockSuggestion[]> {
  const lookbackDays = LOOKBACK_DAYS[periodType ?? ''] ?? DEFAULT_LOOKBACK
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)

  // 1. All products + current inventory.
  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
      stockUnit: products.stockUnit,
      purchaseUnit: products.purchaseUnit,
      purchasePackSize: products.purchasePackSize,
      purchasePrice: products.purchasePrice,
      baseUnit: products.baseUnit,
      baseUnitsPerStock: products.baseUnitsPerStock,
      parPerGuest: products.parPerGuest,
      parPerGuestUnit: products.parPerGuestUnit,
      leadTimeDays: products.leadTimeDays,
      onHand: inventory.quantity,
    })
    .from(products)
    .leftJoin(inventory, and(eq(inventory.productId, products.id), eq(inventory.hotelId, hotelId)))
    .where(eq(products.hotelId, hotelId))

  // 2. ISSUE transactions in lookback window with guest counts.
  const txRows = await db
    .select({
      productId: inventoryTransactions.productId,
      quantityStock: inventoryTransactions.quantityStock,
      guestCount: inventoryTransactions.guestCount,
    })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.hotelId, hotelId),
        eq(inventoryTransactions.type, 'ISSUE'),
        isNotNull(inventoryTransactions.guestCount),
        gte(inventoryTransactions.createdAt, since),
      ),
    )

  // 3. On-order quantities from open lists (exclude completed/draft).
  const openStatuses = ['pending', 'shopping', 'in_review', 'on_hold']
  const openListIds = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(and(eq(shoppingLists.hotelId, hotelId), inArray(shoppingLists.status, openStatuses)))
  const openIds = openListIds.map((r) => r.id)

  const onOrderMap = new Map<string, number>()
  if (openIds.length > 0) {
    const onOrderRows = await db
      .select({
        productId: shoppingListItems.productId,
        qty: sql<string>`SUM(${shoppingListItems.requestedQuantity})`,
      })
      .from(shoppingListItems)
      .where(inArray(shoppingListItems.shoppingListId, openIds))
      .groupBy(shoppingListItems.productId)
    for (const r of onOrderRows) {
      if (r.productId) onOrderMap.set(r.productId, parseFloat(r.qty ?? '0'))
    }
  }

  // 4. Group transactions by product.
  const txByProduct = new Map<string, Array<{ stockQty: number; guests: number }>>()
  for (const tx of txRows) {
    if (!tx.productId || !tx.guestCount) continue
    const entry = { stockQty: Math.abs(parseFloat(tx.quantityStock)), guests: tx.guestCount }
    const arr = txByProduct.get(tx.productId) ?? []
    arr.push(entry)
    txByProduct.set(tx.productId, arr)
  }

  const suggestions: RestockSuggestion[] = []

  for (const p of productRows) {
    const pricing: ProductPricing = {
      stockUnit: p.stockUnit,
      purchaseUnit: p.purchaseUnit,
      purchasePackSize: p.purchasePackSize,
      purchasePrice: p.purchasePrice,
      baseUnit: p.baseUnit,
      baseUnitsPerStock: p.baseUnitsPerStock,
    }
    const stockPrice = pricePerStockUnit(pricing)
    const packSize = purchasePackSizeOrOne(pricing)
    const onHand = parseFloat(p.onHand ?? '0')
    const onOrder = onOrderMap.get(p.id) ?? 0
    const leadTime = p.leadTimeDays ?? HOTEL_DEFAULT_LEAD_TIME
    const txSamples = txByProduct.get(p.id) ?? []

    let ratePerGuest: number | null = null
    let safetyStock = 0
    let source: RestockSuggestion['source'] = 'unknown'
    let sampleSize = 0

    if (txSamples.length >= 3) {
      // Compute mean rate from history.
      const totalStock = txSamples.reduce((s, t) => s + t.stockQty, 0)
      const totalGuests = txSamples.reduce((s, t) => s + t.guests, 0)
      ratePerGuest = totalGuests > 0 ? totalStock / totalGuests : 0
      sampleSize = txSamples.length
      source = 'history'

      // Stddev of per-event rate for safety stock.
      const rates = txSamples.map((t) => t.stockQty / t.guests)
      const mean = rates.reduce((s, r) => s + r, 0) / rates.length
      const variance = rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length
      const stddev = Math.sqrt(variance)
      safetyStock = Z_95 * stddev * Math.sqrt(expectedGuestCount)
    } else if (p.parPerGuest) {
      // Fall back to par level.
      let parInStock = parseFloat(p.parPerGuest)
      if (p.parPerGuestUnit === 'base' && p.baseUnitsPerStock) {
        parInStock = parInStock / parseFloat(p.baseUnitsPerStock)
      }
      ratePerGuest = parInStock
      sampleSize = txSamples.length
      source = 'par'
    } else {
      continue
    }

    const needed = ratePerGuest * expectedGuestCount
    const shortfall = Math.max(0, needed + safetyStock - onHand - onOrder)

    // Snap to purchase-pack multiples (round up to nearest box/case).
    const suggestedQty = packSize > 1 ? Math.ceil(shortfall / packSize) * packSize : Math.ceil(shortfall)

    if (suggestedQty <= 0) continue

    // Cover days = how many days current stock + on-order lasts at the expected daily rate.
    const dailyRate = needed / Math.max(periodDays, 1)
    const coverDays = dailyRate > 0 ? (onHand + onOrder) / dailyRate : Infinity
    const urgency: RestockSuggestion['urgency'] =
      coverDays < leadTime ? 'critical' : coverDays < periodDays ? 'soon' : 'ok'

    // Display label: e.g. "3 boxes (18 bottles)" or "18 bottles".
    const purchaseQty = packSize > 1 ? suggestedQty / packSize : null
    const suggestedQtyDisplay =
      purchaseQty && p.purchaseUnit
        ? `${purchaseQty} ${p.purchaseUnit}${purchaseQty !== 1 ? 's' : ''} (${suggestedQty} ${p.stockUnit}s)`
        : `${suggestedQty} ${p.stockUnit}${suggestedQty !== 1 ? 's' : ''}`

    suggestions.push({
      productId: p.id,
      productName: p.name,
      category: p.category,
      stockUnit: p.stockUnit,
      purchaseUnit: p.purchaseUnit,
      purchasePackSize: p.purchasePackSize,
      suggestedQty,
      suggestedQtyDisplay,
      onHand,
      onOrder,
      urgency,
      source,
      sampleSize,
      ratePerGuest,
      coverDays: isFinite(coverDays) ? coverDays : null,
      pricePerStockUnit: stockPrice > 0 ? stockPrice : null,
    })
  }

  // Sort: critical → soon → ok, then by category, then name.
  const urgencyOrder = { critical: 0, soon: 1, ok: 2 }
  suggestions.sort((a, b) => {
    const ud = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (ud !== 0) return ud
    const cd = a.category.localeCompare(b.category)
    if (cd !== 0) return cd
    return a.productName.localeCompare(b.productName)
  })

  return suggestions
}

export const getRestockSuggestions = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      expectedGuestCount: number
      periodDays: number
      periodType?: string
    }) => data,
  )
  .handler(async ({ data }): Promise<RestockSuggestion[]> => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    return computeRestockSuggestions(hotelId, data.expectedGuestCount, data.periodDays, data.periodType)
  })

export const generateDraftFromDefaults = createServerFn({ method: 'POST' })
  .inputValidator((name?: string) => name)
  .handler(async ({ data: name }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const userId = process.env.MOCK_USER_ID

    // Pull defaults from the most-recently completed list, or fall back to sensible values.
    const [lastList] = await db
      .select({
        expectedDailyOccupancy: shoppingLists.expectedDailyOccupancy,
        periodDays: shoppingLists.periodDays,
        mealsPerDayCount: shoppingLists.mealsPerDayCount,
        periodType: shoppingLists.periodType,
        expectedGuestCount: shoppingLists.expectedGuestCount,
      })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.hotelId, hotelId), eq(shoppingLists.status, 'completed')))
      .orderBy(desc(shoppingLists.completedAt))
      .limit(1)

    const dailyOccupancy = lastList?.expectedDailyOccupancy ?? 50
    const pDays = lastList?.periodDays ?? 7
    const meals = lastList?.mealsPerDayCount ?? 1
    const pType = lastList?.periodType ?? 'weekly'
    const expectedGuests = lastList?.expectedGuestCount ?? dailyOccupancy * pDays * meals

    const suggestions = await computeRestockSuggestions(hotelId, expectedGuests, pDays, pType)
    if (suggestions.length === 0) return null

    const totalValue = suggestions.reduce(
      (s, sg) => s + sg.suggestedQty * (sg.pricePerStockUnit ?? 0),
      0,
    )

    const listName =
      name ??
      `Week of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — Auto`

    const [list] = await db
      .insert(shoppingLists)
      .values({
        hotelId,
        name: listName,
        priority: 'normal',
        createdBy: userId || undefined,
        status: 'draft',
        totalValue: totalValue.toFixed(2),
        periodType: pType,
        expectedGuestCount: expectedGuests,
        expectedDailyOccupancy: dailyOccupancy,
        periodDays: pDays,
        mealsPerDayCount: meals,
      })
      .returning()

    await db.insert(shoppingListItems).values(
      suggestions.map((sg) => ({
        shoppingListId: list.id,
        productId: sg.productId,
        requestedQuantity: sg.suggestedQty.toString(),
        pricePerStockUnit: (sg.pricePerStockUnit ?? 0).toFixed(4),
        requestedUnit: 'stock',
        status: 'pending',
      })),
    )

    return list
  })

export const setProductBarcode = createServerFn({ method: 'POST' })
  .inputValidator((data: { productId: string; barcode: string }) => data)
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    try {
      await db
        .update(products)
        .set({ barcode: data.barcode })
        .where(and(eq(products.id, data.productId), eq(products.hotelId, hotelId)))
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        throw new Error('That barcode is already assigned to another product')
      }
      throw err
    }
  })
