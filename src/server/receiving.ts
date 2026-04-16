import { createServerFn } from '@tanstack/react-start'
import {
  db,
  receivingBatches,
  receivingItems,
  products,
  inventory,
  inventoryTransactions,
} from '@/db'
import { eq, sql } from 'drizzle-orm'
import type { BatchWithItems } from '@/types'

export const getReceivingBatches = createServerFn({ method: 'GET' }).handler(
  async () => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    return db
      .select()
      .from(receivingBatches)
      .where(eq(receivingBatches.hotelId, hotelId))
      .orderBy(sql`${receivingBatches.createdAt} DESC`)
  },
)

export const getBatch = createServerFn({ method: 'GET' })
  .inputValidator((batchId: string) => batchId)
  .handler(async ({ data: batchId }): Promise<BatchWithItems | null> => {
    const [batch] = await db
      .select()
      .from(receivingBatches)
      .where(eq(receivingBatches.id, batchId))
      .limit(1)

    if (!batch) return null

    const items = await db
      .select({
        id: receivingItems.id,
        batchId: receivingItems.batchId,
        productId: receivingItems.productId,
        expectedQuantity: receivingItems.expectedQuantity,
        receivedQuantity: receivingItems.receivedQuantity,
        checkedBy: receivingItems.checkedBy,
        checkedAt: receivingItems.checkedAt,
        createdAt: receivingItems.createdAt,
        productName: products.name,
        productUnit: products.unit,
        productCategory: products.category,
        productBarcode: products.barcode,
      })
      .from(receivingItems)
      .leftJoin(products, eq(receivingItems.productId, products.id))
      .where(eq(receivingItems.batchId, batchId))

    const totalItems = items.length
    const verifiedItems = items.filter(
      (i) =>
        i.receivedQuantity !== null &&
        i.expectedQuantity !== null &&
        parseFloat(i.receivedQuantity) >= parseFloat(i.expectedQuantity),
    ).length

    return {
      ...batch,
      items: items.map((i) => ({
        ...i,
        productName: i.productName ?? 'Unknown',
        productUnit: i.productUnit ?? '',
        productCategory: i.productCategory ?? 'General',
        productBarcode: i.productBarcode ?? null,
      })),
      totalItems,
      verifiedItems,
    }
  })

export const upsertBatchItem = createServerFn({ method: 'POST' })
  .inputValidator((data: { itemId: string; receivedQuantity: number }) => data)
  .handler(async ({ data }) => {
    const userId = process.env.MOCK_USER_ID
    await db
      .update(receivingItems)
      .set({
        receivedQuantity: data.receivedQuantity.toString(),
        checkedBy: userId || undefined,
        checkedAt: new Date(),
      })
      .where(eq(receivingItems.id, data.itemId))
  })

export const approveBatch = createServerFn({ method: 'POST' })
  .inputValidator((batchId: string) => batchId)
  .handler(async ({ data: batchId }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const userId = process.env.MOCK_USER_ID

    const items = await db
      .select()
      .from(receivingItems)
      .where(eq(receivingItems.batchId, batchId))

    for (const item of items) {
      if (!item.productId || !item.receivedQuantity) continue

      const qty = parseFloat(item.receivedQuantity)
      const productId = item.productId

      await db
        .insert(inventory)
        .values({
          hotelId,
          productId,
          quantity: qty.toString(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [inventory.hotelId, inventory.productId],
          set: {
            quantity: sql`${inventory.quantity} + ${qty}`,
            updatedAt: new Date(),
          },
        })

      await db.insert(inventoryTransactions).values({
        hotelId,
        productId,
        type: 'RECEIVE',
        quantity: qty.toString(),
        referenceId: batchId,
        referenceType: 'receiving_batch',
        method: 'manual',
        createdBy: userId || undefined,
      })
    }

    await db
      .update(receivingBatches)
      .set({
        status: 'verified',
        verifiedBy: userId || undefined,
        verifiedAt: new Date(),
      })
      .where(eq(receivingBatches.id, batchId))

    return { success: true }
  })
