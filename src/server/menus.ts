import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq } from 'drizzle-orm'
import type {ProductPricing} from '@/server/lib/pricing';
import type { WizardDishInput, WizardMenuInput } from '@/lib/pantry-gen'
import { db, dishIngredients, dishes, menus, products } from '@/db'
import { getAuthContext, requireRole, validateBranchAccess } from '@/server/auth/context'
import { getLearnedPerGuest } from '@/server/lib/learned-par'
import {  toStockQty } from '@/server/lib/pricing'
import { resolveOrCreateProduct } from '@/server/lib/resolve-product'
import { structureRecipes } from '@/server/ai/pantry-gen/structure'
import { checkTierLimit } from '@/server/tier-check'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'event'

// ─── Reads ──────────────────────────────────────────────────────────────────

export const listMenus = createServerFn({ method: 'GET' })
  .inputValidator(
    (params: { branchId: string; mealType?: MealType; includeInactive?: boolean }) => params,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    await validateBranchAccess(ctx, data.branchId)

    const conditions = [eq(menus.branchId, data.branchId)]
    if (data.mealType) conditions.push(eq(menus.mealType, data.mealType))
    if (!data.includeInactive) conditions.push(eq(menus.isActive, true))

    return db
      .select()
      .from(menus)
      .where(and(...conditions))
      .orderBy(asc(menus.mealType), asc(menus.name))
  })

export const getMenuWithDishes = createServerFn({ method: 'GET' })
  .inputValidator((menuId: string) => menuId)
  .handler(async ({ data: menuId }) => {
    const ctx = await getAuthContext()

    const [menu] = await db.select().from(menus).where(eq(menus.id, menuId)).limit(1)
    if (!menu) throw new Error('Menu not found')
    await validateBranchAccess(ctx, menu.branchId)

    const dishRows = await db
      .select()
      .from(dishes)
      .where(eq(dishes.menuId, menuId))
      .orderBy(asc(dishes.name))

    if (dishRows.length === 0) return { menu, dishes: [] }

    const allIngredients = await db
      .select({
        id: dishIngredients.id,
        dishId: dishIngredients.dishId,
        productId: dishIngredients.productId,
        quantityPerServing: dishIngredients.quantityPerServing,
        unit: dishIngredients.unit,
        isSubstitutable: dishIngredients.isSubstitutable,
        notes: dishIngredients.notes,
        productName: products.name,
        productStockUnit: products.stockUnit,
        productBaseUnit: products.baseUnit,
        productServingUnit: products.servingUnit,
      })
      .from(dishIngredients)
      .leftJoin(products, eq(dishIngredients.productId, products.id))
      .innerJoin(dishes, eq(dishes.id, dishIngredients.dishId))
      .where(eq(dishes.menuId, menuId))

    const byDish = new Map<string, typeof allIngredients>()
    for (const ing of allIngredients) {
      if (!byDish.has(ing.dishId)) byDish.set(ing.dishId, [])
      byDish.get(ing.dishId)!.push(ing)
    }

    return {
      menu,
      dishes: dishRows.map((d) => ({ ...d, ingredients: byDish.get(d.id) ?? [] })),
    }
  })

// ─── Menu writes ────────────────────────────────────────────────────────────

export const createMenu = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      name: string
      mealType: MealType
      eventTag?: string | null
      notes?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')
    await validateBranchAccess(ctx, data.branchId)

    if (!data.name.trim()) throw new Error('Menu name is required')

    const [created] = await db
      .insert(menus)
      .values({
        branchId: data.branchId,
        name: data.name.trim(),
        mealType: data.mealType,
        eventTag: data.eventTag?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .returning()

    return created
  })

// Create one or more menus (+ their dishes and recipes) from free-text recipes,
// e.g. the draft produced by "Add Menu with Procly" image extraction. This is
// MENU creation, not pantry setup: the AI structures recipe lines into products
// + product-linked ingredients, products are created BARE (no par, no pricing,
// no opening stock), and ingredients with no stated quantity are still linked
// (quantity 0). Par/pricing are added later via the pantry "generate from menus"
// step. FK-ordered, no transaction (consistent with the rest of the codebase).
export const createMenusFromRecipes = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      menus: Array<WizardMenuInput>
      dishes: Array<WizardDishInput>
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')
    await validateBranchAccess(ctx, data.branchId)

    if (data.dishes.length === 0 || data.dishes.every((d) => !d.recipe.trim())) {
      throw new Error('Add at least one dish with a recipe before creating the menu.')
    }

    const limits = await checkTierLimit(ctx.companyId, 'products')
    if (!limits.allowed) {
      throw new Error(
        `Product limit reached (${limits.current}/${limits.max}). Upgrade your plan to add more products.`,
      )
    }

    const { branchId } = data

    // Structure free-text recipes into products + linked ingredients. keepZeroQty
    // so an ingredient named without a quantity still attaches to the dish.
    const structured = await structureRecipes(data.menus, data.dishes, { keepZeroQty: true })

    // 1. Bare products (resolve against existing by name; create with unit model
    //    only — no par/pricing/stock).
    const keyToProductId = new Map<string, string>()
    for (const p of structured.products) {
      const { productId } = await resolveOrCreateProduct(branchId, {
        name: p.name,
        category: p.category,
        stockUnit: p.stockUnit,
        baseUnit: p.baseUnit ?? null,
        baseUnitsPerStock: p.baseUnitsPerStock ?? null,
        servingUnit: p.servingUnit ?? null,
        servingSize: p.servingSize ?? null,
      })
      keyToProductId.set(p.tempKey, productId)
    }

    // 2. Menus
    const menuRefToId = new Map<string, string>()
    for (const m of data.menus) {
      if (!m.name.trim()) continue
      const [menu] = await db
        .insert(menus)
        .values({
          branchId,
          name: m.name.trim(),
          mealType: m.mealType,
          eventTag: m.eventTag?.trim() || null,
        })
        .returning({ id: menus.id })
      menuRefToId.set(m.tempId, menu.id)
    }

    // 3. Dishes + ingredient links (keep zero-qty links; refined later)
    let dishCount = 0
    for (const d of structured.dishes) {
      const menuId = menuRefToId.get(d.menuRef)
      if (!menuId || !d.name.trim()) continue

      const [dish] = await db
        .insert(dishes)
        .values({
          menuId,
          name: d.name.trim(),
          defaultServingsPerGuest: String(d.defaultServingsPerGuest || 1),
        })
        .returning({ id: dishes.id })
      dishCount++

      const links = d.ingredients
        .map((ing) => {
          const productId = keyToProductId.get(ing.productTempKey)
          if (!productId) return null
          return {
            dishId: dish.id,
            productId,
            quantityPerServing: String(ing.quantityPerServing || 0),
            unit: ing.unit,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (links.length > 0) await db.insert(dishIngredients).values(links)
    }

    return {
      success: true,
      menus: menuRefToId.size,
      dishes: dishCount,
      products: keyToProductId.size,
    }
  })

export const updateMenu = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      menuId: string
      name?: string
      mealType?: MealType
      eventTag?: string | null
      isActive?: boolean
      notes?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [existing] = await db.select().from(menus).where(eq(menus.id, data.menuId)).limit(1)
    if (!existing) throw new Error('Menu not found')
    await validateBranchAccess(ctx, existing.branchId)

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) patch.name = data.name.trim()
    if (data.mealType !== undefined) patch.mealType = data.mealType
    if (data.eventTag !== undefined) patch.eventTag = data.eventTag?.trim() || null
    if (data.isActive !== undefined) patch.isActive = data.isActive
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || null

    const [updated] = await db
      .update(menus)
      .set(patch)
      .where(eq(menus.id, data.menuId))
      .returning()

    return updated
  })

export const deleteMenu = createServerFn({ method: 'POST' })
  .inputValidator((menuId: string) => menuId)
  .handler(async ({ data: menuId }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [existing] = await db.select().from(menus).where(eq(menus.id, menuId)).limit(1)
    if (!existing) throw new Error('Menu not found')
    await validateBranchAccess(ctx, existing.branchId)

    await db.delete(menus).where(eq(menus.id, menuId))
    return { ok: true }
  })

// ─── Dish writes ────────────────────────────────────────────────────────────

export const createDish = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      menuId: string
      name: string
      description?: string | null
      defaultServingsPerGuest?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [menu] = await db.select().from(menus).where(eq(menus.id, data.menuId)).limit(1)
    if (!menu) throw new Error('Menu not found')
    await validateBranchAccess(ctx, menu.branchId)

    if (!data.name.trim()) throw new Error('Dish name is required')

    const [created] = await db
      .insert(dishes)
      .values({
        menuId: data.menuId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        defaultServingsPerGuest:
          data.defaultServingsPerGuest !== undefined
            ? String(data.defaultServingsPerGuest)
            : '1',
      })
      .returning()

    return created
  })

export const updateDish = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      dishId: string
      name?: string
      description?: string | null
      defaultServingsPerGuest?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [existing] = await db
      .select({ dishId: dishes.id, branchId: menus.branchId })
      .from(dishes)
      .innerJoin(menus, eq(dishes.menuId, menus.id))
      .where(eq(dishes.id, data.dishId))
      .limit(1)
    if (!existing) throw new Error('Dish not found')
    await validateBranchAccess(ctx, existing.branchId)

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) patch.name = data.name.trim()
    if (data.description !== undefined) patch.description = data.description?.trim() || null
    if (data.defaultServingsPerGuest !== undefined) {
      patch.defaultServingsPerGuest = String(data.defaultServingsPerGuest)
    }

    const [updated] = await db
      .update(dishes)
      .set(patch)
      .where(eq(dishes.id, data.dishId))
      .returning()

    return updated
  })

export const deleteDish = createServerFn({ method: 'POST' })
  .inputValidator((dishId: string) => dishId)
  .handler(async ({ data: dishId }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [existing] = await db
      .select({ dishId: dishes.id, branchId: menus.branchId })
      .from(dishes)
      .innerJoin(menus, eq(dishes.menuId, menus.id))
      .where(eq(dishes.id, dishId))
      .limit(1)
    if (!existing) throw new Error('Dish not found')
    await validateBranchAccess(ctx, existing.branchId)

    await db.delete(dishes).where(eq(dishes.id, dishId))
    return { ok: true }
  })

// ─── Recipe (ingredients) ───────────────────────────────────────────────────

// Replace-all: simpler than diffing add/remove/update on the client. Reload
// the menu after to get the new ingredient ids.
export const setDishIngredients = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      dishId: string
      ingredients: Array<{
        productId: string
        quantityPerServing: number
        unit: 'stock' | 'base' | 'serving'
        isSubstitutable?: boolean
        notes?: string | null
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [existing] = await db
      .select({ dishId: dishes.id, branchId: menus.branchId })
      .from(dishes)
      .innerJoin(menus, eq(dishes.menuId, menus.id))
      .where(eq(dishes.id, data.dishId))
      .limit(1)
    if (!existing) throw new Error('Dish not found')
    await validateBranchAccess(ctx, existing.branchId)

    await db.delete(dishIngredients).where(eq(dishIngredients.dishId, data.dishId))

    if (data.ingredients.length === 0) return { ok: true, count: 0 }

    const inserted = await db
      .insert(dishIngredients)
      .values(
        data.ingredients.map((ing) => ({
          dishId: data.dishId,
          productId: ing.productId,
          quantityPerServing: String(ing.quantityPerServing),
          unit: ing.unit,
          isSubstitutable: ing.isSubstitutable ?? false,
          notes: ing.notes?.trim() || null,
        })),
      )
      .returning({ id: dishIngredients.id })

    return { ok: true, count: inserted.length }
  })

// ─── Per-dish reconciliation history (recipe vs reality, by ingredient) ─────

// For each ingredient on the menu, compute the configured per-guest amount
// (recipe quantityPerServing × dish defaultServingsPerGuest, in stock units)
// and the learned per-guest amount (from kitchen reconciliations, segmented
// by this menu's mealType + eventTag). Surfaces drift between recipe and
// reality — the load-bearing signal for whether to revise the recipe.
export const getMenuReconciliationStats = createServerFn({ method: 'GET' })
  .inputValidator((menuId: string) => menuId)
  .handler(async ({ data: menuId }) => {
    const ctx = await getAuthContext()

    const [menu] = await db.select().from(menus).where(eq(menus.id, menuId)).limit(1)
    if (!menu) throw new Error('Menu not found')
    await validateBranchAccess(ctx, menu.branchId)

    const ingredientRows = await db
      .select({
        dishId: dishIngredients.dishId,
        dishName: dishes.name,
        defaultServingsPerGuest: dishes.defaultServingsPerGuest,
        productId: dishIngredients.productId,
        productName: products.name,
        quantityPerServing: dishIngredients.quantityPerServing,
        unit: dishIngredients.unit,
        stockUnit: products.stockUnit,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
        servingUnit: products.servingUnit,
        servingSize: products.servingSize,
      })
      .from(dishIngredients)
      .innerJoin(dishes, eq(dishes.id, dishIngredients.dishId))
      .innerJoin(products, eq(products.id, dishIngredients.productId))
      .where(eq(dishes.menuId, menuId))

    if (ingredientRows.length === 0) return { menuId, dishes: [] }

    const productIds = Array.from(new Set(ingredientRows.map((r) => r.productId)))
    const learnedRates = await getLearnedPerGuest({
      branchId: menu.branchId,
      productIds,
      mealType: menu.mealType,
      eventTag: menu.eventTag ?? undefined,
    })
    const learnedMap = new Map(learnedRates.map((l) => [l.productId, l]))

    type IngredientStat = {
      productId: string
      productName: string
      stockUnit: string
      configuredPerGuestStock: number
      learnedPerGuestStock: number | null
      deltaPct: number | null
      confidence: 'low' | 'medium' | 'high' | null
      sampleSize: number
      source: 'reconciliation' | 'issuance' | 'static-par' | 'recipe-derived' | 'none'
    }
    const byDish = new Map<
      string,
      { dishId: string; dishName: string; ingredients: Array<IngredientStat> }
    >()

    for (const row of ingredientRows) {
      const pricing: ProductPricing = {
        stockUnit: row.stockUnit,
        purchaseUnit: row.purchaseUnit,
        purchasePackSize: row.purchasePackSize,
        purchasePrice: row.purchasePrice,
        baseUnit: row.baseUnit,
        baseUnitsPerStock: row.baseUnitsPerStock,
        servingUnit: row.servingUnit,
        servingSize: row.servingSize,
      }
      const qtyPerServingStock = toStockQty(
        parseFloat(row.quantityPerServing),
        row.unit as 'stock' | 'base' | 'serving',
        pricing,
      )
      const servingsPerGuest = parseFloat(row.defaultServingsPerGuest)
      const configuredPerGuestStock = qtyPerServingStock * servingsPerGuest

      const learned = learnedMap.get(row.productId)
      const learnedPerGuestStock = learned?.perGuestStock ?? null
      const deltaPct =
        learnedPerGuestStock !== null && configuredPerGuestStock > 0
          ? Math.round(
              ((learnedPerGuestStock - configuredPerGuestStock) / configuredPerGuestStock) *
                100,
            )
          : null

      if (!byDish.has(row.dishId)) {
        byDish.set(row.dishId, {
          dishId: row.dishId,
          dishName: row.dishName,
          ingredients: [],
        })
      }
      byDish.get(row.dishId)!.ingredients.push({
        productId: row.productId,
        productName: row.productName,
        stockUnit: row.stockUnit,
        configuredPerGuestStock,
        learnedPerGuestStock,
        deltaPct,
        confidence: learned?.confidence ?? null,
        sampleSize: learned?.sampleSize ?? 0,
        source: learned?.source ?? 'none',
      })
    }

    return {
      menuId,
      mealType: menu.mealType,
      eventTag: menu.eventTag,
      dishes: Array.from(byDish.values()),
    }
  })

// ─── Most-recent-activity helper (for the menu list page) ───────────────────

export const getRecentMenuActivity = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }) => {
    const ctx = await getAuthContext()
    await validateBranchAccess(ctx, branchId)

    return db
      .select({ id: menus.id, name: menus.name, updatedAt: menus.updatedAt, createdAt: menus.createdAt })
      .from(menus)
      .where(eq(menus.branchId, branchId))
      .orderBy(desc(menus.updatedAt), desc(menus.createdAt))
      .limit(5)
  })
