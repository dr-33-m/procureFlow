import { createServerFn } from '@tanstack/react-start'
import { db, shoppingLists, shoppingListItems, users, products } from '@/db'
import { eq, and, desc, count } from 'drizzle-orm'
import type { ShoppingListWithDetails } from '@/types'

export const getShoppingLists = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ShoppingListWithDetails[]> => {
    const hotelId = process.env.MOCK_HOTEL_ID!

    const rows = await db
      .select({
        id: shoppingLists.id,
        hotelId: shoppingLists.hotelId,
        name: shoppingLists.name,
        priority: shoppingLists.priority,
        status: shoppingLists.status,
        totalValue: shoppingLists.totalValue,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        completedAt: shoppingLists.completedAt,
        createdBy: shoppingLists.createdBy,
        assignedTo: shoppingLists.assignedTo,
        creatorName: users.name,
      })
      .from(shoppingLists)
      .leftJoin(users, eq(shoppingLists.createdBy, users.id))
      .where(eq(shoppingLists.hotelId, hotelId))
      .orderBy(desc(shoppingLists.createdAt))

    const itemCounts = await db
      .select({ shoppingListId: shoppingListItems.shoppingListId, count: count() })
      .from(shoppingListItems)
      .groupBy(shoppingListItems.shoppingListId)
    const countMap = Object.fromEntries(itemCounts.map((r) => [r.shoppingListId, r.count]))

    const runnerRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.hotelId, hotelId))
    const runnerMap = Object.fromEntries(runnerRows.map((r) => [r.id, r.name]))

    return rows.map((r) => ({
      ...r,
      creatorName: r.creatorName,
      runnerName: r.assignedTo ? (runnerMap[r.assignedTo] ?? null) : null,
      itemCount: countMap[r.id] ?? 0,
    }))
  },
)

export const getRunners = createServerFn({ method: 'GET' }).handler(async () => {
  const hotelId = process.env.MOCK_HOTEL_ID!
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.hotelId, hotelId), eq(users.role, 'runner')))
})

export const getProductCatalog = createServerFn({ method: 'GET' }).handler(async () => {
  const hotelId = process.env.MOCK_HOTEL_ID!
  return db
    .select({ id: products.id, name: products.name, unit: products.unit, category: products.category })
    .from(products)
    .where(eq(products.hotelId, hotelId))
    .orderBy(products.name)
})

export const createShoppingList = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      name: string
      assignedTo: string | null
      priority: string
      items: Array<{ productId: string; requestedQuantity: number; unitPrice: number }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const hotelId = process.env.MOCK_HOTEL_ID!
    const userId = process.env.MOCK_USER_ID

    const totalValue = data.items.reduce(
      (sum, item) => sum + item.requestedQuantity * item.unitPrice,
      0,
    )

    const [list] = await db
      .insert(shoppingLists)
      .values({
        hotelId,
        name: data.name,
        priority: data.priority,
        createdBy: userId || undefined,
        assignedTo: data.assignedTo ?? undefined,
        status: 'pending',
        totalValue: totalValue.toFixed(2),
      })
      .returning()

    if (data.items.length > 0) {
      await db.insert(shoppingListItems).values(
        data.items.map((item) => ({
          shoppingListId: list.id,
          productId: item.productId,
          requestedQuantity: item.requestedQuantity.toString(),
          unitPrice: item.unitPrice.toString(),
          status: 'pending',
        })),
      )
    }

    return list
  })
