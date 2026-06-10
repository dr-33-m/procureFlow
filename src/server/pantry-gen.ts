import { createServerFn } from '@tanstack/react-start'
import type { GenDish, MealType } from '@/lib/pantry-gen'
import { db, dishIngredients, dishes, menus } from '@/db'
import { getAuthContext, requireRole, validateBranchAccess } from '@/server/auth/context'
import { checkTierLimit } from '@/server/tier-check'
import { resolveOrCreateProduct } from '@/server/lib/resolve-product'
import { deriveParByProduct } from '@/lib/pantry-gen'

// Final, user-reviewed product row (unit model + pricing + opening stock).
type CommitProduct = {
  tempKey: string
  name: string
  category: string
  stockUnit: string
  baseUnit?: string | null
  baseUnitsPerStock?: number | null
  servingUnit?: string | null
  servingSize?: number | null
  purchaseUnit?: string | null
  purchasePackSize?: number | null
  purchasePrice?: number | null
  supplier?: string | null
  initialQuantity?: number | null
}

type CommitMenu = {
  tempId: string
  name: string
  mealType: MealType
  eventTag?: string | null
}

// Commit a reviewed pantry proposal: create products → menus → dishes →
// recipe links, in FK order. Par-per-guest is recomputed here from the FINAL
// (possibly edited) unit model + recipes so it always matches what's stored —
// the client preview is never trusted for the persisted value. Stored in base
// units when the product has a base unit (keeps precision under numeric(10,2)),
// otherwise stock units. Tagged parSource='recipe-derived' so the UI flags it
// as an estimate the learning loop will refine.
//
// Not wrapped in a DB transaction, consistent with the rest of the codebase
// (createProduct / importInventoryFromCSV also do ordered sequential inserts).
export const commitGeneratedPantry = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      menus: Array<CommitMenu>
      products: Array<CommitProduct>
      dishes: Array<GenDish>
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')
    await validateBranchAccess(ctx, data.branchId)

    const limits = await checkTierLimit(ctx.companyId, 'products')
    if (!limits.allowed) {
      throw new Error(
        `Product limit reached (${limits.current}/${limits.max}). Upgrade your plan to add more products.`,
      )
    }

    const { branchId } = data

    // Recompute par (stock units) from the final unit model + recipes.
    const parByKey = deriveParByProduct(
      data.products.map((p) => ({
        tempKey: p.tempKey,
        name: p.name,
        category: p.category,
        stockUnit: p.stockUnit,
        baseUnit: p.baseUnit ?? null,
        baseUnitsPerStock: p.baseUnitsPerStock ?? null,
        servingUnit: p.servingUnit ?? null,
        servingSize: p.servingSize ?? null,
      })),
      data.dishes,
    )

    // ── 1. Products (+ inventory + supplier) ──────────────────────────────────
    const keyToProductId = new Map<string, string>()
    let createdCount = 0
    for (const p of data.products) {
      const parStock = parByKey.get(p.tempKey) ?? 0
      // Store par in base units when available so small per-guest amounts survive
      // numeric(10,2); otherwise stock units.
      const useBase = !!p.baseUnit && (p.baseUnitsPerStock ?? 0) > 0
      const parPerGuest =
        parStock > 0 ? (useBase ? parStock * (p.baseUnitsPerStock as number) : parStock) : null

      const { productId, created } = await resolveOrCreateProduct(branchId, {
        name: p.name,
        category: p.category,
        stockUnit: p.stockUnit,
        initialQuantity: p.initialQuantity ?? 0,
        initialQuantityUnit: 'stock',
        parPerGuest,
        parPerGuestUnit: useBase ? 'base' : 'stock',
        parSource: 'recipe-derived',
        purchaseUnit: p.purchaseUnit ?? null,
        purchasePackSize: p.purchasePackSize ?? null,
        purchasePrice: p.purchasePrice ?? null,
        baseUnit: p.baseUnit ?? null,
        baseUnitsPerStock: p.baseUnitsPerStock ?? null,
        servingUnit: p.servingUnit ?? null,
        servingSize: p.servingSize ?? null,
        supplier: p.supplier
          ? { name: p.supplier, pricePerUnit: p.purchasePrice ?? null, priceUnit: 'purchase' }
          : null,
      })
      keyToProductId.set(p.tempKey, productId)
      if (created) createdCount++
    }

    // ── 2. Menus ──────────────────────────────────────────────────────────────
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

    // ── 3. Dishes + recipe links ──────────────────────────────────────────────
    let dishCount = 0
    for (const d of data.dishes) {
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
          if (!productId || !(ing.quantityPerServing > 0)) return null
          return {
            dishId: dish.id,
            productId,
            quantityPerServing: String(ing.quantityPerServing),
            unit: ing.unit,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (links.length > 0) {
        await db.insert(dishIngredients).values(links)
      }
    }

    return {
      success: true,
      productsCreated: createdCount,
      productsTotal: data.products.length,
      menus: menuRefToId.size,
      dishes: dishCount,
    }
  })
