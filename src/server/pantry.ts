import { createServerFn } from '@tanstack/react-start'
import { db, inventory, products, productSuppliers } from '@/db'
import { eq, and, sql, ilike, inArray } from 'drizzle-orm'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { pricePerStockUnit, toStockQty, type ProductPricing } from '@/server/lib/pricing'
import type { InventoryWithProduct, ProductSupplier } from '@/types'

export const getPantryStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const rows = await db
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
      .where(eq(inventory.hotelId, hotelId))

    const totalSkus = rows.length
    const outOfStockCount = rows.filter(
      (r) => parseFloat(r.quantity ?? '0') === 0,
    ).length
    const lowStockCount = rows.filter(
      (r) =>
        parseFloat(r.quantity ?? '0') > 0 &&
        parseFloat(r.quantity ?? '0') <= LOW_STOCK_THRESHOLD,
    ).length
    const inventoryValue = rows.reduce((sum, r) => {
      const qty = parseFloat(r.quantity ?? '0')
      const pricing: ProductPricing = {
        stockUnit: r.stockUnit ?? '',
        purchaseUnit: r.purchaseUnit ?? null,
        purchasePackSize: r.purchasePackSize ?? null,
        purchasePrice: r.purchasePrice ?? null,
        baseUnit: r.baseUnit ?? null,
        baseUnitsPerStock: r.baseUnitsPerStock ?? null,
      }
      return sum + qty * pricePerStockUnit(pricing)
    }, 0)

    return { totalSkus, outOfStockCount, lowStockCount, inventoryValue }
  },
)

export const getInventoryItems = createServerFn({ method: 'GET' })
  .inputValidator(
    (params: {
      page: number
      pageSize: number
      category: string
      sortBy: string
      q?: string
    }) => params,
  )
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const { page, pageSize, category, sortBy, q } = data
    const offset = (page - 1) * pageSize

    const conditions = [eq(inventory.hotelId, hotelId)]
    if (category && category !== 'all') conditions.push(eq(products.category, category))
    if (q) conditions.push(ilike(products.name, `%${q}%`))

    const allRows = await db
      .select({
        id: inventory.id,
        hotelId: inventory.hotelId,
        productId: inventory.productId,
        quantity: inventory.quantity,
        updatedAt: inventory.updatedAt,
        productName: products.name,
        productCategory: products.category,
        productSku: products.barcode,
        parPerGuest: products.parPerGuest,
        stockUnit: products.stockUnit,
        purchaseUnit: products.purchaseUnit,
        purchasePackSize: products.purchasePackSize,
        purchasePrice: products.purchasePrice,
        baseUnit: products.baseUnit,
        baseUnitsPerStock: products.baseUnitsPerStock,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(and(...conditions))

    const total = allRows.length

    const sorted = [...allRows].sort((a, b) => {
      if (sortBy === 'quantity') {
        return parseFloat(b.quantity ?? '0') - parseFloat(a.quantity ?? '0')
      }
      return (a.productName ?? '').localeCompare(b.productName ?? '')
    })

    const paginated = sorted.slice(offset, offset + pageSize)

    // Batch-fetch suppliers for paginated product IDs
    const productIds = paginated
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
      items: paginated.map((r) => ({
        ...r,
        productName: r.productName ?? 'Unknown',
        productCategory: r.productCategory ?? 'General',
        productSku: r.productSku ?? null,
        parPerGuest: r.parPerGuest ?? null,
        stockUnit: r.stockUnit ?? '',
        purchaseUnit: r.purchaseUnit ?? null,
        purchasePackSize: r.purchasePackSize ?? null,
        purchasePrice: r.purchasePrice ?? null,
        baseUnit: r.baseUnit ?? null,
        baseUnitsPerStock: r.baseUnitsPerStock ?? null,
        suppliers: suppliersByProduct[r.productId ?? ''] ?? [],
      })) as InventoryWithProduct[],
      total,
      page,
      pageSize,
    }
  })

export const getCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const rows = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.hotelId, hotelId))
      .orderBy(products.category)
    return rows.map((r) => r.category)
  },
)

export const getProductCatalog = createServerFn({ method: 'GET' }).handler(
  async () => {
    const hotelId = process.env.MOCK_HOTEL_ID!
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
      })
      .from(products)
      .where(eq(products.hotelId, hotelId))
      .orderBy(products.name)
  },
)

export const addInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      productId: string
      quantity: number
      quantityUnit?: 'stock' | 'purchase'
    }) => data,
  )
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    // Convert to stock units if the user entered in purchase units.
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
        })
      }
    }

    await db
      .insert(inventory)
      .values({
        hotelId,
        productId: data.productId,
        quantity: stockQty.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [inventory.hotelId, inventory.productId],
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
      inventoryId: string
      quantity: number
      parPerGuest?: number | null
      purchasePrice?: number | null
      purchaseUnit?: string | null
      purchasePackSize?: number | null
      baseUnit?: string | null
      baseUnitsPerStock?: number | null
      barcode?: string | null
    }) => data,
  )
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    await db
      .update(inventory)
      .set({ quantity: data.quantity.toString(), updatedAt: new Date() })
      .where(and(eq(inventory.id, data.inventoryId), eq(inventory.hotelId, hotelId)))

    const hasProductUpdate =
      data.parPerGuest !== undefined ||
      data.purchasePrice !== undefined ||
      data.purchaseUnit !== undefined ||
      data.purchasePackSize !== undefined ||
      data.baseUnit !== undefined ||
      data.baseUnitsPerStock !== undefined ||
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
        if (data.baseUnit !== undefined)
          productUpdate.baseUnit = data.baseUnit || null
        if (data.baseUnitsPerStock !== undefined)
          productUpdate.baseUnitsPerStock =
            data.baseUnitsPerStock != null ? data.baseUnitsPerStock.toString() : null
        if (data.barcode !== undefined)
          productUpdate.barcode = data.barcode || null

        try {
          await db
            .update(products)
            .set(productUpdate)
            .where(and(eq(products.id, inv.productId), eq(products.hotelId, hotelId)))
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
  .inputValidator((inventoryId: string) => inventoryId)
  .handler(async ({ data: inventoryId }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const [row] = await db
      .select({ productId: inventory.productId })
      .from(inventory)
      .where(and(eq(inventory.id, inventoryId), eq(inventory.hotelId, hotelId)))

    if (!row) throw new Error('Inventory item not found')

    await db.delete(inventory).where(eq(inventory.id, inventoryId))

    // Delete the product if no other inventory row references it
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
    await db.delete(productSuppliers).where(eq(productSuppliers.id, id))
    return { success: true }
  })

export const createProduct = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      name: string
      stockUnit: string
      category: string
      initialQuantity: number
      initialQuantityUnit?: 'stock' | 'purchase'
      parPerGuest?: number | null
      parPerGuestUnit?: 'stock' | 'base'
      purchaseUnit?: string | null
      purchasePackSize?: number | null
      purchasePrice?: number | null
      baseUnit?: string | null
      baseUnitsPerStock?: number | null
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
    const hotelId = process.env.MOCK_HOTEL_ID!

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
    }

    // Convert initial quantity to stock units.
    const stockQty = toStockQty(
      data.initialQuantity,
      data.initialQuantityUnit ?? 'stock',
      pricing,
    )

    const [product] = await db
      .insert(products)
      .values({
        hotelId,
        name: data.name,
        stockUnit: data.stockUnit,
        category: data.category || 'General',
        parPerGuest: data.parPerGuest != null ? data.parPerGuest.toString() : null,
        parPerGuestUnit: data.parPerGuestUnit ?? 'stock',
        purchaseUnit: data.purchaseUnit || null,
        purchasePackSize: data.purchasePackSize != null ? data.purchasePackSize.toString() : null,
        purchasePrice: data.purchasePrice != null ? data.purchasePrice.toString() : null,
        baseUnit: data.baseUnit || null,
        baseUnitsPerStock: data.baseUnitsPerStock != null ? data.baseUnitsPerStock.toString() : null,
        leadTimeDays: data.leadTimeDays ?? null,
        barcode: data.barcode || null,
      })
      .returning()

    await db
      .insert(inventory)
      .values({
        hotelId,
        productId: product.id,
        quantity: stockQty.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [inventory.hotelId, inventory.productId],
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
        barcode?: string | null
      }>,
    ) => rows,
  )
  .handler(async ({ data: rows }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    let imported = 0

    for (const row of rows) {
      if (!row.name || !row.stockUnit) continue

      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.hotelId, hotelId), eq(products.name, row.name)))
        .then((r) => r[0])

      let productId: string

      if (existing) {
        productId = existing.id
        const updateSet: Record<string, unknown> = {}
        if (row.parPerGuest != null) updateSet.parPerGuest = row.parPerGuest.toString()
        if (row.purchasePrice != null) updateSet.purchasePrice = row.purchasePrice.toString()
        if (row.purchaseUnit) updateSet.purchaseUnit = row.purchaseUnit
        if (row.purchasePackSize != null) updateSet.purchasePackSize = row.purchasePackSize.toString()
        if (row.baseUnit) updateSet.baseUnit = row.baseUnit
        if (row.baseUnitsPerStock != null) updateSet.baseUnitsPerStock = row.baseUnitsPerStock.toString()
        if (row.barcode) updateSet.barcode = row.barcode
        if (Object.keys(updateSet).length > 0) {
          await db.update(products).set(updateSet).where(eq(products.id, productId))
        }
      } else {
        const [newProduct] = await db
          .insert(products)
          .values({
            hotelId,
            name: row.name,
            stockUnit: row.stockUnit,
            category: row.category || 'General',
            parPerGuest: row.parPerGuest != null ? row.parPerGuest.toString() : null,
            purchasePrice: row.purchasePrice != null ? row.purchasePrice.toString() : null,
            purchaseUnit: row.purchaseUnit || null,
            purchasePackSize: row.purchasePackSize != null ? row.purchasePackSize.toString() : null,
            baseUnit: row.baseUnit || null,
            baseUnitsPerStock: row.baseUnitsPerStock != null ? row.baseUnitsPerStock.toString() : null,
            barcode: row.barcode || null,
          })
          .returning()
        productId = newProduct.id

        if (row.supplier) {
          await db.insert(productSuppliers).values({
            productId,
            name: row.supplier,
            pricePerUnit: row.purchasePrice != null ? row.purchasePrice.toString() : null,
          })
        }
      }

      await db
        .insert(inventory)
        .values({
          hotelId,
          productId,
          quantity: (row.initialQuantity || 0).toString(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [inventory.hotelId, inventory.productId],
          set: {
            quantity: (row.initialQuantity || 0).toString(),
            updatedAt: new Date(),
          },
        })

      imported++
    }

    return { success: true, imported }
  })
