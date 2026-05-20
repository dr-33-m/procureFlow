import {
  db,
  products,
  inventory,
  menus,
  dishes,
  dishIngredients,
  productBatches,
} from '@/db'
import { eq, and, asc, ilike, inArray, sql } from 'drizzle-orm'
import { getLearnedPerGuest } from '@/server/lib/learned-par'
import {
  listMenusDef,
  getMenuRecipeDef,
  getPantryStockDef,
  getExpiringInventoryDef,
  getLearnedPerGuestDef,
  proposeIssuanceDef,
} from './tool-definitions'

export function createIssuanceTools(branchId: string) {
  const listMenus = listMenusDef.server(async (args: unknown) => {
    const { mealType, eventTag } = args as { mealType?: string; eventTag?: string }
    const conditions = [eq(menus.branchId, branchId), eq(menus.isActive, true)]
    if (mealType) conditions.push(eq(menus.mealType, mealType))
    if (eventTag) conditions.push(eq(menus.eventTag, eventTag))

    const rows = await db
      .select({
        id: menus.id,
        name: menus.name,
        mealType: menus.mealType,
        eventTag: menus.eventTag,
        notes: menus.notes,
      })
      .from(menus)
      .where(and(...conditions))
      .orderBy(asc(menus.mealType), asc(menus.name))

    return { menuCount: rows.length, menus: rows }
  })

  const getMenuRecipe = getMenuRecipeDef.server(async (args: unknown) => {
    const { menuId } = args as { menuId: string }

    const [menu] = await db
      .select()
      .from(menus)
      .where(and(eq(menus.id, menuId), eq(menus.branchId, branchId)))
      .limit(1)
    if (!menu) return { error: 'Menu not found or not in this branch.' }

    const dishRows = await db
      .select()
      .from(dishes)
      .where(eq(dishes.menuId, menuId))
      .orderBy(asc(dishes.name))

    if (dishRows.length === 0) {
      return { menu: { id: menu.id, name: menu.name, mealType: menu.mealType }, dishes: [] }
    }

    const ingredients = await db
      .select({
        dishId: dishIngredients.dishId,
        productId: dishIngredients.productId,
        productName: products.name,
        productCategory: products.category,
        productStockUnit: products.stockUnit,
        productBaseUnit: products.baseUnit,
        productServingUnit: products.servingUnit,
        quantityPerServing: dishIngredients.quantityPerServing,
        unit: dishIngredients.unit,
        isSubstitutable: dishIngredients.isSubstitutable,
      })
      .from(dishIngredients)
      .leftJoin(products, eq(dishIngredients.productId, products.id))
      .where(
        inArray(
          dishIngredients.dishId,
          dishRows.map((d) => d.id),
        ),
      )

    const byDish = new Map<string, typeof ingredients>()
    for (const ing of ingredients) {
      if (!byDish.has(ing.dishId)) byDish.set(ing.dishId, [])
      byDish.get(ing.dishId)!.push(ing)
    }

    return {
      menu: {
        id: menu.id,
        name: menu.name,
        mealType: menu.mealType,
        eventTag: menu.eventTag,
      },
      dishes: dishRows.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        defaultServingsPerGuest: parseFloat(d.defaultServingsPerGuest),
        ingredients: (byDish.get(d.id) ?? []).map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productCategory: i.productCategory,
          quantityPerServing: parseFloat(i.quantityPerServing),
          unit: i.unit,
          stockUnit: i.productStockUnit,
          baseUnit: i.productBaseUnit,
          servingUnit: i.productServingUnit,
          isSubstitutable: i.isSubstitutable,
        })),
      })),
    }
  })

  const getPantryStock = getPantryStockDef.server(async (args: unknown) => {
    const { category, productIds } = args as { category?: string; productIds?: string[] }

    const conditions = [eq(products.branchId, branchId)]
    if (category) conditions.push(ilike(products.category, `%${category}%`))
    if (productIds && productIds.length > 0) conditions.push(inArray(products.id, productIds))

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        stockUnit: products.stockUnit,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
        servingUnit: products.servingUnit,
        servingSize: products.servingSize,
        parPerGuest: products.parPerGuest,
        parPerGuestUnit: products.parPerGuestUnit,
        onHand: inventory.quantity,
      })
      .from(products)
      .leftJoin(
        inventory,
        and(eq(inventory.productId, products.id), eq(inventory.branchId, branchId)),
      )
      .where(and(...conditions))
      .orderBy(asc(products.name))

    return {
      itemCount: rows.length,
      items: rows.map((r) => ({
        productId: r.id,
        name: r.name,
        category: r.category,
        stockUnit: r.stockUnit,
        baseUnit: r.baseUnit,
        baseUnitsPerStock: r.baseUnitsPerStock ? parseFloat(r.baseUnitsPerStock) : null,
        servingUnit: r.servingUnit,
        servingSize: r.servingSize ? parseFloat(r.servingSize) : null,
        parPerGuest: r.parPerGuest ? parseFloat(r.parPerGuest) : null,
        parPerGuestUnit: r.parPerGuestUnit ?? 'stock',
        currentStock: parseFloat(r.onHand ?? '0'),
      })),
    }
  })

  const getExpiringInventory = getExpiringInventoryDef.server(async (args: unknown) => {
    const { daysOut } = args as { daysOut?: number }
    const horizon = daysOut ?? 5
    const cutoff = new Date(Date.now() + horizon * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const rows = await db
      .select({
        batchId: productBatches.id,
        productId: productBatches.productId,
        productName: products.name,
        category: products.category,
        stockUnit: products.stockUnit,
        quantityStock: productBatches.quantityStock,
        receivedAt: productBatches.receivedAt,
        bestBefore: productBatches.bestBefore,
      })
      .from(productBatches)
      .leftJoin(products, eq(productBatches.productId, products.id))
      .where(
        and(
          eq(productBatches.branchId, branchId),
          eq(productBatches.isDepleted, false),
          // Postgres date <= date literal — null bestBefore is filtered out
          // because the < / <= comparison returns null/false for nulls.
          sql`${productBatches.bestBefore} IS NOT NULL`,
          sql`${productBatches.bestBefore} <= ${cutoff}::date`,
        ),
      )
      .orderBy(asc(productBatches.bestBefore))

    return {
      itemCount: rows.length,
      horizonDays: horizon,
      // Empty result is meaningful — it means either no batches exist or none
      // have best-before dates set yet (cold start). The agent should treat
      // empty as "no expiry pressure" rather than an error.
      items: rows.map((r) => ({
        batchId: r.batchId,
        productId: r.productId,
        productName: r.productName,
        category: r.category,
        stockUnit: r.stockUnit,
        quantityStock: parseFloat(r.quantityStock),
        receivedAt: r.receivedAt,
        bestBefore: r.bestBefore,
      })),
    }
  })

  const getLearnedPerGuestTool = getLearnedPerGuestDef.server(async (args: unknown) => {
    const { productIds, mealType, eventTag, lookbackDays } = args as {
      productIds: string[]
      mealType?: string
      eventTag?: string
      lookbackDays?: number
    }
    const results = await getLearnedPerGuest({
      branchId,
      productIds,
      mealType,
      eventTag,
      lookbackDays,
    })
    return {
      results: results.map((r) => ({
        productId: r.productId,
        perGuestStock: r.perGuestStock,
        confidence: r.confidence,
        sampleSize: r.sampleSize,
        source: r.source,
      })),
    }
  })

  // The action tool — its result is forwarded to the UI and rendered as a
  // proposal card. No DB writes happen here; approval goes through the
  // existing deduction cart.
  const proposeIssuance = proposeIssuanceDef.server(async (args: unknown) => {
    const data = args as {
      summary: string
      reasoning: string
      expectedGuestCount: number
      expectedServings?: number
      menuId?: string
      eventTag?: string
      items: Array<{
        productId: string
        productName: string
        quantityStock: number
        stockUnit: string
        basis:
          | 'learned-rate'
          | 'menu-recipe'
          | 'expiry-driven'
          | 'manual-override'
          | 'fallback-static-par'
        lineReasoning?: string
      }>
    }
    return { ...data, accepted: true }
  })

  return [
    listMenus,
    getMenuRecipe,
    getPantryStock,
    getExpiringInventory,
    getLearnedPerGuestTool,
    proposeIssuance,
  ]
}
