import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
import type { GenDish, GenProductSpec, PantryProposal } from '@/lib/pantry-gen'
import { db, dishIngredients, dishes, inventory, menus, productSuppliers, products } from '@/db'
import { getAuthContext, requireRole, validateBranchAccess } from '@/server/auth/context'
import { withDerivedPar } from '@/lib/pantry-gen'

const numOrNull = (v: string | null): number | null => {
  if (v == null) return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

// Derive a pantry proposal from EXISTING menus (no AI). Their dishes already
// carry structured ingredients (product + quantityPerServing + unit), so par is
// computed deterministically the same way as the manual generator: per product,
// Σ over dishes [ defaultServingsPerGuest × qtyPerServing(in stock) ]. Returns
// the same PantryProposal shape the review grid consumes, with productId used as
// the temp key (the products already exist — apply updates them).
export const derivePantryFromMenus = createServerFn({ method: 'POST' })
  .inputValidator((data: { branchId: string; menuIds: Array<string> }) => data)
  .handler(async ({ data }): Promise<PantryProposal> => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')
    await validateBranchAccess(ctx, data.branchId)

    if (data.menuIds.length === 0) {
      throw new Error('Select at least one menu to generate the pantry from.')
    }

    const rows = await db
      .select({
        dishId: dishes.id,
        dishName: dishes.name,
        menuId: dishes.menuId,
        defaultServingsPerGuest: dishes.defaultServingsPerGuest,
        productId: dishIngredients.productId,
        quantityPerServing: dishIngredients.quantityPerServing,
        unit: dishIngredients.unit,
        productName: products.name,
        category: products.category,
        stockUnit: products.stockUnit,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
        servingUnit: products.servingUnit,
        servingSize: products.servingSize,
      })
      .from(dishIngredients)
      .innerJoin(dishes, eq(dishes.id, dishIngredients.dishId))
      .innerJoin(menus, eq(menus.id, dishes.menuId))
      .innerJoin(products, eq(products.id, dishIngredients.productId))
      .where(and(inArray(dishes.menuId, data.menuIds), eq(menus.branchId, data.branchId)))

    if (rows.length === 0) {
      throw new Error(
        'Those menus have no recipes yet. Add ingredients to their dishes first, then generate.',
      )
    }

    // Unique products (tempKey = productId).
    const productByKey = new Map<string, GenProductSpec>()
    for (const r of rows) {
      if (productByKey.has(r.productId)) continue
      productByKey.set(r.productId, {
        tempKey: r.productId,
        name: r.productName,
        category: r.category,
        stockUnit: r.stockUnit,
        baseUnit: r.baseUnit,
        baseUnitsPerStock: numOrNull(r.baseUnitsPerStock),
        servingUnit: r.servingUnit,
        servingSize: numOrNull(r.servingSize),
      })
    }

    // Group ingredients back into dishes (menuRef = menuId; unused by apply).
    const dishById = new Map<string, GenDish>()
    for (const r of rows) {
      let dish = dishById.get(r.dishId)
      if (!dish) {
        dish = {
          menuRef: r.menuId,
          name: r.dishName,
          defaultServingsPerGuest: numOrNull(r.defaultServingsPerGuest) ?? 1,
          ingredients: [],
        }
        dishById.set(r.dishId, dish)
      }
      dish.ingredients.push({
        productTempKey: r.productId,
        quantityPerServing: numOrNull(r.quantityPerServing) ?? 0,
        unit: r.unit as GenDish['ingredients'][number]['unit'],
      })
    }

    const structured = {
      products: Array.from(productByKey.values()),
      dishes: Array.from(dishById.values()),
    }

    return {
      products: withDerivedPar(structured),
      dishes: structured.dishes,
      menus: [],
    }
  })

// Apply a reviewed pantry derived from existing menus: UPDATE those products in
// place — unit model + par (stored base-units when available, else stock) +
// pricing — and optionally set opening stock. Does NOT create menus/dishes
// (they already exist) and never wipes pricing/stock the user left blank.
type ApplyItem = {
  productId: string
  category?: string | null
  stockUnit: string
  baseUnit?: string | null
  baseUnitsPerStock?: number | null
  servingUnit?: string | null
  servingSize?: number | null
  parPerGuestStock: number
  purchaseUnit?: string | null
  purchasePackSize?: number | null
  purchasePrice?: number | null
  supplier?: string | null
  initialQuantity?: number | null // null/undefined = leave current stock untouched
}

export const applyPantryFromMenus = createServerFn({ method: 'POST' })
  .inputValidator((data: { branchId: string; items: Array<ApplyItem> }) => data)
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')
    await validateBranchAccess(ctx, data.branchId)

    let updated = 0
    for (const item of data.items) {
      const useBase = !!item.baseUnit && (item.baseUnitsPerStock ?? 0) > 0
      const parPerGuest =
        item.parPerGuestStock > 0
          ? useBase
            ? item.parPerGuestStock * (item.baseUnitsPerStock as number)
            : item.parPerGuestStock
          : null

      const patch: Record<string, unknown> = {
        stockUnit: item.stockUnit,
        baseUnit: item.baseUnit || null,
        baseUnitsPerStock: item.baseUnitsPerStock != null ? String(item.baseUnitsPerStock) : null,
        servingUnit: item.servingUnit || null,
        servingSize: item.servingSize != null ? String(item.servingSize) : null,
        parPerGuest: parPerGuest != null ? String(parPerGuest) : null,
        parPerGuestUnit: useBase ? 'base' : 'stock',
        parSource: 'recipe-derived',
        updatedAt: new Date(),
      }
      if (item.category) patch.category = item.category
      // Only touch pricing the user actually provided — never wipe existing.
      if (item.purchaseUnit != null) patch.purchaseUnit = item.purchaseUnit || null
      if (item.purchasePackSize != null) patch.purchasePackSize = String(item.purchasePackSize)
      if (item.purchasePrice != null) patch.purchasePrice = String(item.purchasePrice)

      const res = await db
        .update(products)
        .set(patch)
        .where(and(eq(products.id, item.productId), eq(products.branchId, data.branchId)))
        .returning({ id: products.id })
      if (res.length === 0) continue
      updated++

      if (item.initialQuantity != null) {
        await db
          .update(inventory)
          .set({ quantity: String(item.initialQuantity), updatedAt: new Date() })
          .where(and(eq(inventory.productId, item.productId), eq(inventory.branchId, data.branchId)))
      }

      if (item.supplier?.trim()) {
        await db.insert(productSuppliers).values({
          productId: item.productId,
          name: item.supplier.trim(),
          pricePerUnit: item.purchasePrice != null ? String(item.purchasePrice) : null,
          priceUnit: 'purchase',
        })
      }
    }

    return { success: true, updated }
  })
