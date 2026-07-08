import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { DashboardStats, RecentListActivity } from '@/types'
import type { ProductPricing } from '@/server/lib/pricing'
import {
  db,
  inventory,
  inventoryTransactions,
  kitchenReconciliations,
  products,
  shoppingLists,
  users,
} from '@/db'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { pricePerStockUnit } from '@/server/lib/pricing'
import { getAuthContext } from '@/server/auth/context'

export const getDashboardStats = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<DashboardStats> => {
    await getAuthContext()

    // One inventory scan (joined with products) serves both the stock-level
    // counts and the valuation. Categories + active lists run alongside it.
    const [valRows, catRows, activeListRows] = await Promise.all([
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
      db
        .selectDistinct({ category: products.category })
        .from(products)
        .where(eq(products.branchId, branchId)),
      db
        .select({ id: shoppingLists.id, totalValue: shoppingLists.totalValue })
        .from(shoppingLists)
        .where(
          and(
            eq(shoppingLists.branchId, branchId),
            inArray(shoppingLists.status, [
              'pending',
              'shopping',
              'in_review',
              'on_hold',
            ]),
          ),
        ),
    ])

    const totalItems = valRows.length
    const outOfStock = valRows.filter((r) => parseFloat(r.quantity ?? '0') === 0).length
    const lowStock = valRows.filter(
      (r) =>
        parseFloat(r.quantity ?? '0') > 0 &&
        parseFloat(r.quantity ?? '0') <= LOW_STOCK_THRESHOLD,
    ).length
    const inStock = totalItems - outOfStock - lowStock

    const inStockPct = totalItems ? Math.round((inStock / totalItems) * 100) : 0
    const lowStockPct = totalItems ? Math.round((lowStock / totalItems) * 100) : 0
    const outOfStockPct = totalItems ? Math.round((outOfStock / totalItems) * 100) : 0

    const totalCategories = catRows.length

    const totalValuation = valRows.reduce((sum, r) => {
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

    const activeShoppingLists = activeListRows.length
    const activeListsValue = activeListRows.reduce(
      (sum, r) => sum + parseFloat(r.totalValue ?? '0'),
      0,
    )

    return {
      totalItems,
      totalCategories,
      totalValuation,
      inStockPct,
      lowStockPct,
      outOfStockPct,
      criticalWarnings: outOfStock + lowStock,
      activeShoppingLists,
      activeListsValue,
    }
  })

export const getRecentListActivity = createServerFn({ method: 'GET' })
  .inputValidator((branchId: string) => branchId)
  .handler(async ({ data: branchId }): Promise<Array<RecentListActivity>> => {
    await getAuthContext()

    const shoppingListActivityAt = sql<Date>`GREATEST(
      ${shoppingLists.createdAt},
      COALESCE(${shoppingLists.updatedAt}, ${shoppingLists.createdAt}),
      COALESCE(${shoppingLists.completedAt}, ${shoppingLists.createdAt})
    )`

    const [listRows, issuanceRows, reconciliationRows] = await Promise.all([
      db
        .select({
          id: shoppingLists.id,
          name: shoppingLists.name,
          status: shoppingLists.status,
          priority: shoppingLists.priority,
          totalValue: shoppingLists.totalValue,
          updatedAt: shoppingLists.updatedAt,
          createdAt: shoppingLists.createdAt,
          completedAt: shoppingLists.completedAt,
          activityAt: shoppingListActivityAt,
          creatorName: users.name,
        })
        .from(shoppingLists)
        .leftJoin(users, eq(shoppingLists.createdBy, users.id))
        .where(eq(shoppingLists.branchId, branchId))
        .orderBy(desc(shoppingListActivityAt))
        .limit(10),
      db
        .select({
          id: inventoryTransactions.id,
          quantityStock: inventoryTransactions.quantityStock,
          method: inventoryTransactions.method,
          station: inventoryTransactions.station,
          createdAt: inventoryTransactions.createdAt,
          productName: products.name,
          stockUnit: products.stockUnit,
          createdByName: users.name,
        })
        .from(inventoryTransactions)
        .leftJoin(products, eq(inventoryTransactions.productId, products.id))
        .leftJoin(users, eq(inventoryTransactions.createdBy, users.id))
        .where(
          and(
            eq(inventoryTransactions.branchId, branchId),
            eq(inventoryTransactions.type, 'ISSUE'),
          ),
        )
        .orderBy(desc(inventoryTransactions.createdAt))
        .limit(10),
      db
        .select({
          id: kitchenReconciliations.id,
          serviceDate: kitchenReconciliations.serviceDate,
          mealType: kitchenReconciliations.mealType,
          eventTag: kitchenReconciliations.eventTag,
          actualGuestCount: kitchenReconciliations.actualGuestCount,
          actualServings: kitchenReconciliations.actualServings,
          reportedAt: kitchenReconciliations.reportedAt,
          createdByName: users.name,
        })
        .from(kitchenReconciliations)
        .leftJoin(users, eq(kitchenReconciliations.createdBy, users.id))
        .where(eq(kitchenReconciliations.branchId, branchId))
        .orderBy(desc(kitchenReconciliations.reportedAt))
        .limit(10),
    ])

    const listActivities: Array<RecentListActivity> = listRows.map((r) => {
      const wasCompleted = r.status === 'completed' && !!r.completedAt
      const wasUpdated = !!r.updatedAt

      return {
        id: r.id,
        type: 'shopping_list',
        label: wasCompleted
          ? 'Shopping list completed'
          : wasUpdated
            ? 'Shopping list updated'
            : 'Shopping list created',
        name: r.name,
        detail: `Priority: ${r.priority}`,
        modifiedBy: r.creatorName ?? 'Unknown',
        modifiedAt: r.activityAt,
        value: r.totalValue ?? '0',
        status: r.status,
        priority: r.priority,
        unit: null,
      }
    })

    const issuanceActivities: Array<RecentListActivity> = issuanceRows.map((r) => {
      const quantity = Math.abs(parseFloat(r.quantityStock)).toString()
      const station = r.station?.trim() || 'kitchen'

      return {
        id: r.id,
        type: 'issuance',
        label: 'ISSUE transaction',
        name: r.productName ?? 'Unknown product',
        detail: `Issued to ${station} via ${r.method}`,
        modifiedBy: r.createdByName ?? 'System',
        modifiedAt: r.createdAt,
        value: quantity,
        status: 'issued',
        priority: null,
        unit: r.stockUnit ?? null,
      }
    })

    const reconciliationActivities: Array<RecentListActivity> = reconciliationRows.map((r) => {
      const meal = r.mealType
      const event = r.eventTag ? ` · ${r.eventTag}` : ''

      return {
        id: r.id,
        type: 'reconciliation',
        label: 'Kitchen reconciliation',
        name: `${meal.charAt(0).toUpperCase()}${meal.slice(1)} close-out`,
        detail: `${r.actualGuestCount} guests · ${r.actualServings} servings${event}`,
        modifiedBy: r.createdByName ?? 'System',
        modifiedAt: r.reportedAt,
        value: r.actualServings.toString(),
        status: 'reconciled',
        priority: null,
        unit: 'servings',
      }
    })

    return [
      ...listActivities,
      ...issuanceActivities,
      ...reconciliationActivities,
    ]
      .sort(
        (a, b) =>
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
      )
      .slice(0, 10)
  })
