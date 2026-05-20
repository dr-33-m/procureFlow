import { createServerFn } from '@tanstack/react-start'
import { db, menus, dishes, dishIngredients, products } from '@/db'
import { eq, and, asc, desc } from 'drizzle-orm'
import { getAuthContext, requireRole, validateBranchAccess } from '@/server/auth/context'

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
