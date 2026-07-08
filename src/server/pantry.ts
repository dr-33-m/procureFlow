import { createServerFn } from '@tanstack/react-start'
import { db, inventory, products, productSuppliers } from '@/db'
import { eq, and, sql, ilike, inArray, asc, desc } from 'drizzle-orm'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { pricePerStockUnit, toStockQty, type ProductPricing } from '@/server/lib/pricing'
import { getAuthContext, requireRole } from '@/server/auth/context'
import { checkTierLimit } from '@/server/tier-check'
import { resolveOrCreateProduct } from '@/server/lib/resolve-product'
import type { InventoryWithProduct, ProductSupplier } from '@/types'

export const getPantryStats = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }) => {
    await getAuthContext()

    const [counts, pricingRows] = await Promise.all([
      db
        .select({
          totalSkus: sql<number>`count(*)::int`,
          outOfStockCount: sql<number>`count(*) filter (where ${inventory.quantity}::numeric = 0)::int`,
          lowStockCount: sql<number>`count(*) filter (where ${inventory.quantity}::numeric > 0 and ${inventory.quantity}::numeric <= ${LOW_STOCK_THRESHOLD})::int`,
        })
        .from(inventory)
        .where(eq(inventory.branchId, branchId)),
      db
        .select({
          quantity: inventory.quantity,
          stockUnit: products.stockUnit,
          purchaseUnit: products.purchaseUnit,
          purchasePackSize: products.purchasePackSize,
          purchasePrice: products.purchasePrice,
          baseUnit: products.baseUnit,
          baseUnitsPerStock: products.baseUnitsPerStock,
        })
        .from(inventory)
        .leftJoin(products, eq(inventory.productId, products.id))
        .where(eq(inventory.branchId, branchId)),
    ])

    const { totalSkus, outOfStockCount, lowStockCount } = counts[0] ?? {
      totalSkus: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
    }

    const inventoryValue = pricingRows.reduce((sum, r) => {
      const qty = parseFloat(r.quantity ?? '0')
      const pricing: ProductPricing = {
        stockUnit: r.stockUnit ?? '',
        purchaseUnit: r.purchaseUnit ?? null,
        purchasePackSize: r.purchasePackSize ?? null,
        purchasePrice: r.purchasePrice ?? null,
        baseUnit: r.baseUnit ?? null,
        baseUnitsPerStock: r.baseUnitsPerStock ?? null,
        servingUnit: null,
        servingSize: null,
      }
      return sum + qty * pricePerStockUnit(pricing)
    }, 0)

    return { totalSkus, outOfStockCount, lowStockCount, inventoryValue }
  })

export const getInventoryItems = createServerFn({ method: 'GET' })
  .inputValidator(
    (params: {
      branchId: string
      page: number
      pageSize: number
      category: string
      sortBy: string
      stockStatus?: 'all' | 'attention' | 'low' | 'out'
      q?: string
    }) => params,
  )
  .handler(async ({ data }) => {
    await getAuthContext()
    const { branchId, page, pageSize, category, sortBy, q } = data
    const stockStatus =
      data.stockStatus === 'attention' ||
      data.stockStatus === 'low' ||
      data.stockStatus === 'out'
        ? data.stockStatus
        : 'all'
    const offset = (page - 1) * pageSize

    const conditions = [eq(inventory.branchId, branchId)]
    if (category && category !== 'all') conditions.push(eq(products.category, category))
    if (q) conditions.push(ilike(products.name, `%${q}%`))
    if (stockStatus === 'attention') {
      conditions.push(sql`${inventory.quantity}::numeric <= ${LOW_STOCK_THRESHOLD}`)
    }
    if (stockStatus === 'low') {
      conditions.push(
        sql`${inventory.quantity}::numeric > 0 and ${inventory.quantity}::numeric <= ${LOW_STOCK_THRESHOLD}`,
      )
    }
    if (stockStatus === 'out') {
      conditions.push(sql`${inventory.quantity}::numeric = 0`)
    }

    const quantityValue = sql<number>`${inventory.quantity}::numeric`
    const urgentStockRank = sql<number>`case
      when ${inventory.quantity}::numeric = 0 then 0
      when ${inventory.quantity}::numeric <= ${LOW_STOCK_THRESHOLD} then 1
      else 2
    end`
    const primaryOrder =
      sortBy === 'quantity'
        ? desc(quantityValue)
        : asc(products.name)
    const orderBy =
      stockStatus === 'all'
        ? [primaryOrder]
        : [asc(urgentStockRank), asc(quantityValue), primaryOrder]

    const [countResult, rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventory)
        .leftJoin(products, eq(inventory.productId, products.id))
        .where(and(...conditions)),
      db
        .select({
          id: inventory.id,
          branchId: inventory.branchId,
          productId: inventory.productId,
          quantity: inventory.quantity,
          updatedAt: inventory.updatedAt,
          productName: products.name,
          productCategory: products.category,
          productSku: products.barcode,
          parPerGuest: products.parPerGuest,
          parPerGuestUnit: products.parPerGuestUnit,
          stockUnit: products.stockUnit,
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
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset(offset),
    ])

    const total = countResult[0]?.count ?? 0

    const productIds = rows
      .map((r) => r.productId)
      .filter((id): id is string => !!id)

    const supplierRows =
      productIds.length > 0
        ? await db
            .select()
            .from(productSuppliers)
            .where(inArray(productSuppliers.productId, productIds))
        : []

    const suppliersByProduct = supplierRows.reduce<Record<string, ProductSupplier[]>>(
      (acc, s) => {
        if (!acc[s.productId]) acc[s.productId] = []
        acc[s.productId].push(s)
        return acc
      },
      {},
    )

    return {
      items: rows.map((r) => ({
        ...r,
        productName: r.productName ?? 'Unknown',
        productCategory: r.productCategory ?? 'General',
        productSku: r.productSku ?? null,
        parPerGuest: r.parPerGuest ?? null,
        parPerGuestUnit: r.parPerGuestUnit ?? 'stock',
        stockUnit: r.stockUnit ?? '',
        purchaseUnit: r.purchaseUnit ?? null,
        purchasePackSize: r.purchasePackSize ?? null,
        purchasePrice: r.purchasePrice ?? null,
        baseUnit: r.baseUnit ?? null,
        baseUnitsPerStock: r.baseUnitsPerStock ?? null,
        servingUnit: r.servingUnit ?? null,
        servingSize: r.servingSize ?? null,
        suppliers: suppliersByProduct[r.productId ?? ''] ?? [],
      })) as InventoryWithProduct[],
      total,
      page,
      pageSize,
    }
  })

export const getCategories = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }) => {
    await getAuthContext()
    const rows = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.branchId, branchId))
      .orderBy(products.category)
    return rows.map((r) => r.category)
  })

export const getProductCatalog = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }) => {
    await getAuthContext()
    return db
      .select({
        id: products.id,
        name: products.name,
        stockUnit: products.stockUnit,
        category: products.category,
        barcode: products.barcode,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
        servingUnit: products.servingUnit,
        servingSize: products.servingSize,
      })
      .from(products)
      .where(eq(products.branchId, branchId))
      .orderBy(products.name)
  })

export const addInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      productId: string
      quantity: number
      quantityUnit?: 'stock' | 'purchase'
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    let stockQty = data.quantity
    if (data.quantityUnit === 'purchase') {
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
        .where(eq(products.id, data.productId))
      if (product) {
        stockQty = toStockQty(data.quantity, 'purchase', {
          stockUnit: product.stockUnit,
          purchaseUnit: product.purchaseUnit,
          purchasePackSize: product.purchasePackSize,
          purchasePrice: product.purchasePrice,
          baseUnit: product.baseUnit,
          baseUnitsPerStock: product.baseUnitsPerStock,
          servingUnit: null,
          servingSize: null,
        })
      }
    }

    await db
      .insert(inventory)
      .values({
        branchId: data.branchId,
        productId: data.productId,
        quantity: stockQty.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [inventory.branchId, inventory.productId],
        set: {
          quantity: sql`inventory.quantity + ${stockQty}`,
          updatedAt: new Date(),
        },
      })
    return { success: true }
  })

export const updateInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      inventoryId: string
      quantity: number
      parPerGuest?: number | null
      parPerGuestUnit?: 'stock' | 'base' | 'serving'
      purchasePrice?: number | null
      purchaseUnit?: string | null
      purchasePackSize?: number | null
      baseUnit?: string | null
      baseUnitsPerStock?: number | null
      servingUnit?: string | null
      servingSize?: number | null
      barcode?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    await db
      .update(inventory)
      .set({ quantity: data.quantity.toString(), updatedAt: new Date() })
      .where(and(eq(inventory.id, data.inventoryId), eq(inventory.branchId, data.branchId)))

    const hasProductUpdate =
      data.parPerGuest !== undefined ||
      data.parPerGuestUnit !== undefined ||
      data.purchasePrice !== undefined ||
      data.purchaseUnit !== undefined ||
      data.purchasePackSize !== undefined ||
      data.baseUnit !== undefined ||
      data.baseUnitsPerStock !== undefined ||
      data.servingUnit !== undefined ||
      data.servingSize !== undefined ||
      data.barcode !== undefined

    if (hasProductUpdate) {
      const [inv] = await db
        .select({ productId: inventory.productId })
        .from(inventory)
        .where(eq(inventory.id, data.inventoryId))

      if (inv) {
        const productUpdate: Record<string, unknown> = {}
        if (data.parPerGuest !== undefined)
          productUpdate.parPerGuest =
            data.parPerGuest != null ? data.parPerGuest.toString() : null
        if (data.purchasePrice !== undefined)
          productUpdate.purchasePrice =
            data.purchasePrice != null ? data.purchasePrice.toString() : null
        if (data.purchaseUnit !== undefined)
          productUpdate.purchaseUnit = data.purchaseUnit || null
        if (data.purchasePackSize !== undefined)
          productUpdate.purchasePackSize =
            data.purchasePackSize != null ? data.purchasePackSize.toString() : null
        if (data.parPerGuestUnit !== undefined)
          productUpdate.parPerGuestUnit = data.parPerGuestUnit ?? 'stock'
        if (data.baseUnit !== undefined) productUpdate.baseUnit = data.baseUnit || null
        if (data.baseUnitsPerStock !== undefined)
          productUpdate.baseUnitsPerStock =
            data.baseUnitsPerStock != null ? data.baseUnitsPerStock.toString() : null
        if (data.servingUnit !== undefined)
          productUpdate.servingUnit = data.servingUnit || null
        if (data.servingSize !== undefined)
          productUpdate.servingSize =
            data.servingSize != null ? data.servingSize.toString() : null
        if (data.barcode !== undefined) productUpdate.barcode = data.barcode || null

        try {
          await db
            .update(products)
            .set(productUpdate)
            .where(and(eq(products.id, inv.productId), eq(products.branchId, data.branchId)))
        } catch (err: unknown) {
          if (
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code: string }).code === '23505'
          ) {
            throw new Error('That barcode is already assigned to another product')
          }
          throw err
        }
      }
    }

    return { success: true }
  })

export const deleteInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { inventoryId: string; branchId: string }) => data)
  .handler(async ({ data: { inventoryId, branchId } }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [row] = await db
      .select({ productId: inventory.productId })
      .from(inventory)
      .where(and(eq(inventory.id, inventoryId), eq(inventory.branchId, branchId)))

    if (!row) throw new Error('Inventory item not found')

    await db.delete(inventory).where(eq(inventory.id, inventoryId))

    const remaining = await db
      .select({ id: inventory.id })
      .from(inventory)
      .where(eq(inventory.productId, row.productId))

    if (remaining.length === 0) {
      await db.delete(productSuppliers).where(eq(productSuppliers.productId, row.productId))
      await db.delete(products).where(eq(products.id, row.productId))
    }

    return { success: true }
  })

export const getProductSuppliers = createServerFn({ method: 'GET' })
  .inputValidator((productId: string) => productId)
  .handler(async ({ data: productId }) => {
    await getAuthContext()
    return db
      .select()
      .from(productSuppliers)
      .where(eq(productSuppliers.productId, productId))
      .orderBy(productSuppliers.createdAt)
  })

export const createProductSupplier = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      productId: string
      name: string
      pricePerUnit?: number | null
      priceUnit?: 'purchase' | 'stock' | 'base'
      leadTimeDays?: number | null
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const [supplier] = await db
      .insert(productSuppliers)
      .values({
        productId: data.productId,
        name: data.name,
        pricePerUnit: data.pricePerUnit != null ? data.pricePerUnit.toString() : null,
        priceUnit: data.priceUnit ?? 'stock',
        leadTimeDays: data.leadTimeDays ?? null,
      })
      .returning()
    return supplier
  })

export const deleteProductSupplier = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')
    await db.delete(productSuppliers).where(eq(productSuppliers.id, id))
    return { success: true }
  })

export const createProduct = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      name: string
      stockUnit: string
      category: string
      initialQuantity: number
      initialQuantityUnit?: 'stock' | 'purchase'
      parPerGuest?: number | null
      parPerGuestUnit?: 'stock' | 'base' | 'serving'
      purchaseUnit?: string | null
      purchasePackSize?: number | null
      purchasePrice?: number | null
      baseUnit?: string | null
      baseUnitsPerStock?: number | null
      servingUnit?: string | null
      servingSize?: number | null
      leadTimeDays?: number | null
      barcode?: string | null
      suppliers?: Array<{
        name: string
        pricePerUnit?: number | null
        priceUnit?: 'purchase' | 'stock' | 'base'
        leadTimeDays?: number | null
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const productLimits = await checkTierLimit(ctx.companyId, 'products')
    if (!productLimits.allowed) {
      throw new Error(
        `Product limit reached (${productLimits.current}/${productLimits.max}). Upgrade your plan to add more products.`,
      )
    }

    if (data.purchaseUnit && (!data.purchasePackSize || data.purchasePackSize <= 0)) {
      return { success: false, error: 'purchasePackSize must be > 0 when purchaseUnit is set' }
    }

    const pricing: ProductPricing = {
      stockUnit: data.stockUnit,
      purchaseUnit: data.purchaseUnit ?? null,
      purchasePackSize: data.purchasePackSize != null ? data.purchasePackSize.toString() : null,
      purchasePrice: data.purchasePrice != null ? data.purchasePrice.toString() : null,
      baseUnit: data.baseUnit ?? null,
      baseUnitsPerStock: data.baseUnitsPerStock != null ? data.baseUnitsPerStock.toString() : null,
      servingUnit: data.servingUnit ?? null,
      servingSize: data.servingSize != null ? data.servingSize.toString() : null,
    }

    const stockQty = toStockQty(
      data.initialQuantity,
      data.initialQuantityUnit ?? 'stock',
      pricing,
    )

    const [product] = await db
      .insert(products)
      .values({
        branchId: data.branchId,
        name: data.name,
        stockUnit: data.stockUnit,
        category: data.category || 'General',
        parPerGuest: data.parPerGuest != null ? data.parPerGuest.toString() : null,
        parPerGuestUnit: data.parPerGuestUnit ?? 'stock',
        purchaseUnit: data.purchaseUnit || null,
        purchasePackSize: data.purchasePackSize != null ? data.purchasePackSize.toString() : null,
        purchasePrice: data.purchasePrice != null ? data.purchasePrice.toString() : null,
        baseUnit: data.baseUnit || null,
        baseUnitsPerStock:
          data.baseUnitsPerStock != null ? data.baseUnitsPerStock.toString() : null,
        servingUnit: data.servingUnit || null,
        servingSize: data.servingSize != null ? data.servingSize.toString() : null,
        leadTimeDays: data.leadTimeDays ?? null,
        barcode: data.barcode || null,
      })
      .returning()

    await db
      .insert(inventory)
      .values({
        branchId: data.branchId,
        productId: product.id,
        quantity: stockQty.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [inventory.branchId, inventory.productId],
        set: {
          quantity: sql`inventory.quantity + ${stockQty}`,
          updatedAt: new Date(),
        },
      })

    if (data.suppliers && data.suppliers.length > 0) {
      await db.insert(productSuppliers).values(
        data.suppliers.map((s) => ({
          productId: product.id,
          name: s.name,
          pricePerUnit: s.pricePerUnit != null ? s.pricePerUnit.toString() : null,
          priceUnit: s.priceUnit ?? 'stock',
          leadTimeDays: s.leadTimeDays ?? null,
        })),
      )
    }

    return { success: true, product }
  })

export const importInventoryFromCSV = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      data: {
        branchId: string
        rows: Array<{
          name: string
          stockUnit: string
          category: string
          initialQuantity: number
          parPerGuest?: number | null
          supplier?: string
          purchasePrice?: number | null
          purchaseUnit?: string | null
          purchasePackSize?: number | null
          baseUnit?: string | null
          baseUnitsPerStock?: number | null
          servingUnit?: string | null
          servingSize?: number | null
          parPerGuestUnit?: 'stock' | 'base' | 'serving'
          barcode?: string | null
        }>
      },
    ) => data,
  )
  .handler(async ({ data: { branchId, rows } }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const productLimits = await checkTierLimit(ctx.companyId, 'products')
    if (!productLimits.allowed) {
      throw new Error(
        `Product limit reached (${productLimits.current}/${productLimits.max}). Upgrade your plan to import more products.`,
      )
    }

    // Filter valid rows up front
    const validRows = rows.filter((r) => r.name && r.stockUnit)
    if (validRows.length === 0) return { success: true, imported: 0 }

    // Batch lookup: fetch all existing products by name in one query
    const uniqueNames = [...new Set(validRows.map((r) => r.name))]
    const existingProducts = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.branchId, branchId), inArray(products.name, uniqueNames)))
    const existingByName = new Map(existingProducts.map((p) => [p.name, p.id]))

    // Separate into new vs existing, build batch arrays
    const toInsert = validRows.filter((r) => !existingByName.has(r.name))
    const toUpdate = validRows.filter((r) => existingByName.has(r.name))

    // Batch insert new products
    let newProductMap = new Map<string, string>()
    if (toInsert.length > 0) {
      const inserted = await db
        .insert(products)
        .values(
          toInsert.map((row) => ({
            branchId,
            name: row.name,
            stockUnit: row.stockUnit,
            category: row.category || 'General',
            parPerGuest: row.parPerGuest != null ? row.parPerGuest.toString() : null,
            purchasePrice: row.purchasePrice != null ? row.purchasePrice.toString() : null,
            purchaseUnit: row.purchaseUnit || null,
            purchasePackSize:
              row.purchasePackSize != null ? row.purchasePackSize.toString() : null,
            baseUnit: row.baseUnit || null,
            baseUnitsPerStock:
              row.baseUnitsPerStock != null ? row.baseUnitsPerStock.toString() : null,
            servingUnit: row.servingUnit || null,
            servingSize: row.servingSize != null ? row.servingSize.toString() : null,
            parPerGuestUnit: row.parPerGuestUnit || 'stock',
            barcode: row.barcode || null,
          })),
        )
        .returning({ id: products.id, name: products.name })
      newProductMap = new Map(inserted.map((p) => [p.name, p.id]))
    }

    // Batch insert suppliers for new products that have one
    const supplierValues = toInsert
      .filter((r) => r.supplier)
      .map((r) => ({
        productId: newProductMap.get(r.name)!,
        name: r.supplier!,
        pricePerUnit: r.purchasePrice != null ? r.purchasePrice.toString() : null,
      }))
      .filter((s) => s.productId)
    if (supplierValues.length > 0) {
      await db.insert(productSuppliers).values(supplierValues)
    }

    // Batch update existing products in parallel
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((row) => {
          const productId = existingByName.get(row.name)!
          const updateSet: Record<string, unknown> = {}
          if (row.parPerGuest != null) updateSet.parPerGuest = row.parPerGuest.toString()
          if (row.purchasePrice != null) updateSet.purchasePrice = row.purchasePrice.toString()
          if (row.purchaseUnit) updateSet.purchaseUnit = row.purchaseUnit
          if (row.purchasePackSize != null)
            updateSet.purchasePackSize = row.purchasePackSize.toString()
          if (row.baseUnit) updateSet.baseUnit = row.baseUnit
          if (row.baseUnitsPerStock != null)
            updateSet.baseUnitsPerStock = row.baseUnitsPerStock.toString()
          if (row.servingUnit) updateSet.servingUnit = row.servingUnit
          if (row.servingSize != null) updateSet.servingSize = row.servingSize.toString()
          if (row.parPerGuestUnit) updateSet.parPerGuestUnit = row.parPerGuestUnit
          if (row.barcode) updateSet.barcode = row.barcode
          if (Object.keys(updateSet).length === 0) return Promise.resolve()
          return db.update(products).set(updateSet).where(eq(products.id, productId))
        }),
      )
    }

    // Batch upsert inventory in parallel
    await Promise.all(
      validRows.map((row) => {
        const productId = existingByName.get(row.name) ?? newProductMap.get(row.name)
        if (!productId) return Promise.resolve()
        return db
          .insert(inventory)
          .values({
            branchId,
            productId,
            quantity: (row.initialQuantity || 0).toString(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [inventory.branchId, inventory.productId],
            set: {
              quantity: (row.initialQuantity || 0).toString(),
              updatedAt: new Date(),
            },
          })
      }),
    )

    const imported = validRows.length

    return { success: true, imported }
  })

// Inline create from the recipe editor's IngredientPicker: mint a product on the
// fly so a chef never has to leave the menu to add a missing ingredient.
export const createProductForIngredient = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      name: string
      category?: string
      stockUnit: string
      baseUnit?: string | null
      baseUnitsPerStock?: number | null
      servingUnit?: string | null
      servingSize?: number | null
    }) => data,
  )
  .handler(async ({ data }) => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const limits = await checkTierLimit(ctx.companyId, 'products')
    if (!limits.allowed) {
      throw new Error(
        `Product limit reached (${limits.current}/${limits.max}). Upgrade your plan to add more products.`,
      )
    }

    const { productId } = await resolveOrCreateProduct(data.branchId, {
      name: data.name,
      category: data.category,
      stockUnit: data.stockUnit,
      baseUnit: data.baseUnit ?? null,
      baseUnitsPerStock: data.baseUnitsPerStock ?? null,
      servingUnit: data.servingUnit ?? null,
      servingSize: data.servingSize ?? null,
    })

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        stockUnit: products.stockUnit,
        baseUnit: products.baseUnit,
        servingUnit: products.servingUnit,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    return product
  })
