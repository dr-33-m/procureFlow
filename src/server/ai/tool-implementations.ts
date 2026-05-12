import {
  db,
  products,
  inventory,
  inventoryTransactions,
  shoppingLists,
  shoppingListItems,
  productSuppliers,
} from '@/db'
import { eq, and, desc, sql, isNotNull, gte, inArray, ilike } from 'drizzle-orm'
import { pricePerStockUnit, purchasePackSizeOrOne, type ProductPricing } from '@/server/lib/pricing'
import { DEFAULT_LOOKBACK, HOTEL_DEFAULT_LEAD_TIME, Z_95 } from './constants'
import {
  getPantryStockDef,
  getConsumptionHistoryDef,
  getProductCatalogDef,
  getOpenOrdersDef,
  getPreviousListsDef,
  computeItemRestockDef,
  generateShoppingListDef,
} from './tool-definitions'

export function createTools(branchId: string, userId?: string) {
  const getPantryStock = getPantryStockDef.server(async (args: unknown) => {
    const { category, lowStockOnly } = args as { category?: string; lowStockOnly?: boolean }
    let query = db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        stockUnit: products.stockUnit,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        parPerGuest: products.parPerGuest,
        parPerGuestUnit: products.parPerGuestUnit,
        onHand: inventory.quantity,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(eq(inventory.productId, products.id), eq(inventory.branchId, branchId)),
      )
      .where(eq(products.branchId, branchId))
      .$dynamic()

    if (category) {
      query = query.where(
        and(eq(products.branchId, branchId), ilike(products.category, `%${category}%`)),
      )
    }

    const rows = await query

    let results = rows.map((r) => ({
      productId: r.id,
      name: r.name,
      category: r.category,
      stockUnit: r.stockUnit,
      purchaseUnit: r.purchaseUnit ?? null,
      packSize: r.purchasePackSize ? parseFloat(r.purchasePackSize) : null,
      currentStock: parseFloat(r.onHand ?? '0'),
      parPerGuest: r.parPerGuest ? parseFloat(r.parPerGuest) : null,
      parUnit: r.parPerGuestUnit ?? 'stock',
      pricePerStockUnit: pricePerStockUnit({
        stockUnit: r.stockUnit,
        purchaseUnit: r.purchaseUnit,
        purchasePackSize: r.purchasePackSize,
        purchasePrice: r.purchasePrice,
        baseUnit: null,
        baseUnitsPerStock: null,
        servingUnit: null,
        servingSize: null,
      }),
    }))

    if (lowStockOnly) {
      results = results.filter((r) => r.currentStock < 10)
    }

    return { itemCount: results.length, items: results.slice(0, 50) }
  })

  const getConsumptionHistory = getConsumptionHistoryDef.server(async (args: unknown) => {
    const { lookbackDays, category } = args as { lookbackDays?: number; category?: string }
    const days = lookbackDays ?? DEFAULT_LOOKBACK
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const conditions = [
      eq(inventoryTransactions.branchId, branchId),
      eq(inventoryTransactions.type, 'ISSUE'),
      isNotNull(inventoryTransactions.guestCount),
      gte(inventoryTransactions.createdAt, since),
    ]

    const txRows = await db
      .select({
        productId: inventoryTransactions.productId,
        productName: products.name,
        productCategory: products.category,
        quantityStock: inventoryTransactions.quantityStock,
        guestCount: inventoryTransactions.guestCount,
      })
      .from(inventoryTransactions)
      .innerJoin(products, eq(products.id, inventoryTransactions.productId))
      .where(and(...conditions))

    const byProduct = new Map<
      string,
      { name: string; category: string; totalStock: number; totalGuests: number; samples: number }
    >()

    for (const tx of txRows) {
      if (!tx.productId || !tx.guestCount) continue
      if (category && !tx.productCategory.toLowerCase().includes(category.toLowerCase())) continue

      const existing = byProduct.get(tx.productId) ?? {
        name: tx.productName,
        category: tx.productCategory,
        totalStock: 0,
        totalGuests: 0,
        samples: 0,
      }
      existing.totalStock += Math.abs(parseFloat(tx.quantityStock))
      existing.totalGuests += tx.guestCount
      existing.samples += 1
      byProduct.set(tx.productId, existing)
    }

    const consumption = Array.from(byProduct.entries()).map(([productId, data]) => ({
      productId,
      name: data.name,
      category: data.category,
      ratePerGuest:
        data.totalGuests > 0
          ? Math.round((data.totalStock / data.totalGuests) * 1000) / 1000
          : 0,
      totalConsumed: Math.round(data.totalStock * 100) / 100,
      totalGuests: data.totalGuests,
      issuanceEvents: data.samples,
    }))

    return {
      lookbackDays: days,
      productCount: consumption.length,
      items: consumption.slice(0, 50),
    }
  })

  const getProductCatalog = getProductCatalogDef.server(async (args: unknown) => {
    const { query: searchQuery, category } = args as { query?: string; category?: string }
    const conditions = [eq(products.branchId, branchId)]

    if (searchQuery) {
      conditions.push(ilike(products.name, `%${searchQuery}%`))
    }
    if (category) {
      conditions.push(ilike(products.category, `%${category}%`))
    }

    const rows = await db
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
      })
      .from(products)
      .where(and(...conditions))
      .limit(30)

    const withSuppliers = await Promise.all(
      rows.map(async (p) => {
        const suppliers = await db
          .select({ name: productSuppliers.name, price: productSuppliers.pricePerUnit })
          .from(productSuppliers)
          .where(eq(productSuppliers.productId, p.id))

        return {
          productId: p.id,
          name: p.name,
          category: p.category,
          stockUnit: p.stockUnit,
          purchaseUnit: p.purchaseUnit ?? null,
          packSize: p.purchasePackSize ? parseFloat(p.purchasePackSize) : null,
          pricePerStockUnit: pricePerStockUnit({
            stockUnit: p.stockUnit,
            purchaseUnit: p.purchaseUnit,
            purchasePackSize: p.purchasePackSize,
            purchasePrice: p.purchasePrice,
            baseUnit: p.baseUnit,
            baseUnitsPerStock: p.baseUnitsPerStock,
            servingUnit: null,
            servingSize: null,
          }),
          parPerGuest: p.parPerGuest ? parseFloat(p.parPerGuest) : null,
          suppliers: suppliers.map((s) => ({
            name: s.name,
            price: s.price ? parseFloat(s.price) : null,
          })),
        }
      }),
    )

    return { count: withSuppliers.length, items: withSuppliers }
  })

  const getOpenOrders = getOpenOrdersDef.server(async (_args: unknown) => {
    const openStatuses = ['pending', 'shopping', 'in_review', 'on_hold']
    const openListIds = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(
        and(eq(shoppingLists.branchId, branchId), inArray(shoppingLists.status, openStatuses)),
      )
    const openIds = openListIds.map((r) => r.id)

    if (openIds.length === 0) {
      return { openListCount: 0, items: [] }
    }

    const onOrderRows = await db
      .select({
        productId: shoppingListItems.productId,
        productName: products.name,
        qty: sql<string>`SUM(${shoppingListItems.requestedQuantity})`,
        stockUnit: products.stockUnit,
      })
      .from(shoppingListItems)
      .innerJoin(products, eq(products.id, shoppingListItems.productId))
      .where(inArray(shoppingListItems.shoppingListId, openIds))
      .groupBy(shoppingListItems.productId, products.name, products.stockUnit)

    return {
      openListCount: openIds.length,
      items: onOrderRows.map((r) => ({
        productId: r.productId,
        name: r.productName,
        onOrderQty: parseFloat(r.qty ?? '0'),
        stockUnit: r.stockUnit,
      })),
    }
  })

  const getPreviousLists = getPreviousListsDef.server(async (args: unknown) => {
    const { limit } = args as { limit?: number }
    const lists = await db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        completedAt: shoppingLists.completedAt,
        expectedGuestCount: shoppingLists.expectedGuestCount,
        periodDays: shoppingLists.periodDays,
        periodType: shoppingLists.periodType,
        mealsPerDayCount: shoppingLists.mealsPerDayCount,
        totalValue: shoppingLists.totalValue,
      })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.branchId, branchId), eq(shoppingLists.status, 'completed')))
      .orderBy(desc(shoppingLists.completedAt))
      .limit(limit ?? 3)

    const results = await Promise.all(
      lists.map(async (list) => {
        const items = await db
          .select({
            productName: products.name,
            category: products.category,
            requestedQty: shoppingListItems.requestedQuantity,
            purchasedQty: shoppingListItems.purchasedQuantity,
            stockUnit: products.stockUnit,
          })
          .from(shoppingListItems)
          .innerJoin(products, eq(products.id, shoppingListItems.productId))
          .where(eq(shoppingListItems.shoppingListId, list.id))

        return {
          name: list.name,
          completedAt: list.completedAt?.toISOString() ?? null,
          expectedGuestCount: list.expectedGuestCount,
          periodDays: list.periodDays,
          periodType: list.periodType,
          mealsPerDay: list.mealsPerDayCount,
          totalValue: list.totalValue ? parseFloat(list.totalValue) : null,
          itemCount: items.length,
          items: items.map((i) => ({
            name: i.productName,
            category: i.category,
            requested: parseFloat(i.requestedQty),
            purchased: parseFloat(i.purchasedQty ?? '0'),
            unit: i.stockUnit,
          })),
        }
      }),
    )

    return { count: results.length, lists: results }
  })

  const computeItemRestock = computeItemRestockDef.server(async (args: unknown) => {
    const { productId, expectedGuestCount, periodDays } = args as {
      productId: string
      expectedGuestCount: number
      periodDays: number
    }

    const [product] = await db
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
        servingUnit: products.servingUnit,
        servingSize: products.servingSize,
        leadTimeDays: products.leadTimeDays,
        onHand: inventory.quantity,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(eq(inventory.productId, products.id), eq(inventory.branchId, branchId)),
      )
      .where(and(eq(products.id, productId), eq(products.branchId, branchId)))

    if (!product) return { error: 'Product not found' }

    const pricing: ProductPricing = {
      stockUnit: product.stockUnit,
      purchaseUnit: product.purchaseUnit,
      purchasePackSize: product.purchasePackSize,
      purchasePrice: product.purchasePrice,
      baseUnit: product.baseUnit,
      baseUnitsPerStock: product.baseUnitsPerStock,
      servingUnit: product.servingUnit,
      servingSize: product.servingSize,
    }

    const onHand = parseFloat(product.onHand ?? '0')
    const leadTime = product.leadTimeDays ?? HOTEL_DEFAULT_LEAD_TIME
    const packSize = purchasePackSizeOrOne(pricing)
    const stockPrice = pricePerStockUnit(pricing)

    // Check on-order
    const openStatuses = ['pending', 'shopping', 'in_review', 'on_hold']
    const openListIds = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(
        and(eq(shoppingLists.branchId, branchId), inArray(shoppingLists.status, openStatuses)),
      )
    const openIds = openListIds.map((r) => r.id)

    let onOrder = 0
    if (openIds.length > 0) {
      const [row] = await db
        .select({ qty: sql<string>`SUM(${shoppingListItems.requestedQuantity})` })
        .from(shoppingListItems)
        .where(
          and(
            eq(shoppingListItems.productId, productId),
            inArray(shoppingListItems.shoppingListId, openIds),
          ),
        )
      onOrder = parseFloat(row?.qty ?? '0')
    }

    // Get ISSUE transactions
    const since = new Date(Date.now() - DEFAULT_LOOKBACK * 24 * 60 * 60 * 1000)
    const txRows = await db
      .select({
        quantityStock: inventoryTransactions.quantityStock,
        guestCount: inventoryTransactions.guestCount,
      })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.branchId, branchId),
          eq(inventoryTransactions.productId, productId),
          eq(inventoryTransactions.type, 'ISSUE'),
          isNotNull(inventoryTransactions.guestCount),
          gte(inventoryTransactions.createdAt, since),
        ),
      )

    const samples = txRows
      .filter((t) => t.guestCount)
      .map((t) => ({
        stockQty: Math.abs(parseFloat(t.quantityStock)),
        guests: t.guestCount!,
      }))

    let ratePerGuest: number | null = null
    let safetyStock = 0
    let source: 'history' | 'par' | 'none' = 'none'

    if (samples.length >= 3) {
      const totalStock = samples.reduce((s, t) => s + t.stockQty, 0)
      const totalGuests = samples.reduce((s, t) => s + t.guests, 0)
      ratePerGuest = totalGuests > 0 ? totalStock / totalGuests : 0
      source = 'history'

      const rates = samples.map((t) => t.stockQty / t.guests)
      const mean = rates.reduce((s, r) => s + r, 0) / rates.length
      const variance = rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length
      safetyStock = Z_95 * Math.sqrt(variance) * Math.sqrt(expectedGuestCount)
    } else if (product.parPerGuest) {
      let parInStock = parseFloat(product.parPerGuest)
      if (
        product.parPerGuestUnit === 'serving' &&
        product.servingSize &&
        product.baseUnitsPerStock
      ) {
        parInStock =
          (parInStock * parseFloat(product.servingSize)) /
          parseFloat(product.baseUnitsPerStock)
      } else if (product.parPerGuestUnit === 'base' && product.baseUnitsPerStock) {
        parInStock = parInStock / parseFloat(product.baseUnitsPerStock)
      }
      ratePerGuest = parInStock
      source = 'par'
    }

    if (ratePerGuest === null) {
      return {
        productName: product.name,
        category: product.category,
        stockUnit: product.stockUnit,
        onHand,
        onOrder,
        source: 'none',
        message: 'No consumption history or par level defined for this product',
      }
    }

    const needed = ratePerGuest * expectedGuestCount
    const shortfall = Math.max(0, needed + safetyStock - onHand - onOrder)
    const suggestedQty =
      packSize > 1 ? Math.ceil(shortfall / packSize) * packSize : Math.ceil(shortfall)

    const dailyRate = needed / Math.max(periodDays, 1)
    const coverDays = dailyRate > 0 ? (onHand + onOrder) / dailyRate : Infinity
    const urgency: 'critical' | 'soon' | 'ok' =
      coverDays < leadTime ? 'critical' : coverDays < periodDays ? 'soon' : 'ok'

    return {
      productName: product.name,
      category: product.category,
      stockUnit: product.stockUnit,
      purchaseUnit: product.purchaseUnit ?? null,
      packSize,
      onHand,
      onOrder,
      ratePerGuest: Math.round(ratePerGuest * 1000) / 1000,
      needed: Math.round(needed * 100) / 100,
      safetyStock: Math.round(safetyStock * 100) / 100,
      suggestedQty,
      pricePerStockUnit: stockPrice,
      estimatedCost: Math.round(suggestedQty * stockPrice * 100) / 100,
      urgency,
      source,
      sampleCount: samples.length,
      coverDays: isFinite(coverDays) ? Math.round(coverDays * 10) / 10 : null,
    }
  })

  // generate_shopping_list creates a real draft shopping list in the database.
  const generateShoppingList = generateShoppingListDef.server(async (args: unknown) => {
    const input = args as {
      summary: string
      items: Array<{
        productId: string
        productName: string
        category: string
        quantity: number
        stockUnit: string
        purchaseUnit?: string
        purchasePackSize?: number
        pricePerStockUnit: number
        reason: string
        urgency: 'critical' | 'soon' | 'ok'
      }>
    }
    const totalCost = input.items.reduce(
      (s: number, i: { quantity: number; pricePerStockUnit: number }) =>
        s + i.quantity * i.pricePerStockUnit,
      0,
    )

    if (!branchId) {
      return {
        accepted: false,
        error: 'No branch selected — cannot create shopping list.',
        summary: input.summary,
        itemCount: input.items.length,
        totalEstimatedCost: Math.round(totalCost * 100) / 100,
        items: input.items,
      }
    }

    try {
      // Create draft shopping list in the database
      const [list] = await db
        .insert(shoppingLists)
        .values({
          branchId,
          name: input.summary || 'AI-Generated Shopping List',
          priority: 'normal',
          createdBy: userId ?? undefined,
          status: 'draft',
          totalValue: totalCost.toFixed(2),
        })
        .returning()

      if (input.items.length > 0) {
        await db.insert(shoppingListItems).values(
          input.items.map((item) => ({
            shoppingListId: list.id,
            productId: item.productId,
            requestedQuantity: item.quantity.toString(),
            pricePerStockUnit: item.pricePerStockUnit.toString(),
            requestedUnit: 'stock' as const,
            status: 'pending',
          })),
        )
      }

      return {
        accepted: true,
        listId: list.id,
        summary: input.summary,
        itemCount: input.items.length,
        totalEstimatedCost: Math.round(totalCost * 100) / 100,
        items: input.items,
        message: `Draft shopping list "${input.summary}" created with ${input.items.length} items. You can review and edit it in the Shopping Lists page.`,
      }
    } catch (err) {
      return {
        accepted: false,
        error: err instanceof Error ? err.message : 'Failed to create shopping list',
        summary: input.summary,
        itemCount: input.items.length,
        totalEstimatedCost: Math.round(totalCost * 100) / 100,
        items: input.items,
      }
    }
  })

  return [
    getPantryStock,
    getConsumptionHistory,
    getProductCatalog,
    getOpenOrders,
    getPreviousLists,
    computeItemRestock,
    generateShoppingList,
  ]
}
