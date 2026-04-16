import { createServerFn } from '@tanstack/react-start'
import { db, inventory, products } from '@/db'
import { eq, and } from 'drizzle-orm'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import type { InventoryWithProduct } from '@/types'

export const getPantryStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const rows = await db
      .select({ quantity: inventory.quantity })
      .from(inventory)
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
    const inventoryValue = rows.reduce(
      (sum, r) => sum + parseFloat(r.quantity ?? '0') * 10,
      0,
    )

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
    }) => params,
  )
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const { page, pageSize, category, sortBy } = data
    const offset = (page - 1) * pageSize

    const allRows = await db
      .select({
        id: inventory.id,
        hotelId: inventory.hotelId,
        productId: inventory.productId,
        quantity: inventory.quantity,
        updatedAt: inventory.updatedAt,
        productName: products.name,
        productUnit: products.unit,
        productCategory: products.category,
        productSku: products.barcode,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(
        category && category !== 'all'
          ? and(eq(inventory.hotelId, hotelId), eq(products.category, category))
          : eq(inventory.hotelId, hotelId),
      )

    const total = allRows.length

    const sorted = [...allRows].sort((a, b) => {
      if (sortBy === 'quantity') {
        return parseFloat(b.quantity ?? '0') - parseFloat(a.quantity ?? '0')
      }
      return (a.productName ?? '').localeCompare(b.productName ?? '')
    })

    const paginated = sorted.slice(offset, offset + pageSize)

    return {
      items: paginated.map((r) => ({
        ...r,
        productName: r.productName ?? 'Unknown',
        productUnit: r.productUnit ?? '',
        productCategory: r.productCategory ?? 'General',
        productSku: r.productSku ?? null,
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

export const addInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { productId: string; quantity: number }) => data)
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    await db
      .insert(inventory)
      .values({
        hotelId,
        productId: data.productId,
        quantity: data.quantity.toString(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [inventory.hotelId, inventory.productId],
        set: {
          quantity: data.quantity.toString(),
          updatedAt: new Date(),
        },
      })
    return { success: true }
  })
