import { db, kitchenStock, products, menus } from '@/db'
import { eq, and, or, ilike, desc, inArray } from 'drizzle-orm'
import {
  getKitchenStockDef,
  matchProductDef,
  draftReconciliationDef,
} from './tool-definitions'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createKitchenTools(branchId: string) {
  const getKitchenStockTool = getKitchenStockDef.server(async (args: unknown) => {
    if (!branchId) return { itemCount: 0, items: [] }
    const { status } = args as { status?: 'pending' | 'partial' | 'all' }

    const conditions = [eq(kitchenStock.branchId, branchId)]
    if (status === 'pending') conditions.push(eq(kitchenStock.status, 'pending'))
    else if (status === 'partial') conditions.push(eq(kitchenStock.status, 'partial'))
    else if (!status || status !== 'all') {
      // Default: pending + partial
      conditions.push(
        or(
          eq(kitchenStock.status, 'pending'),
          eq(kitchenStock.status, 'partial'),
        )!,
      )
    }

    const rows = await db
      .select({
        kitchenStockId: kitchenStock.id,
        productId: kitchenStock.productId,
        productName: products.name,
        category: products.category,
        stockUnit: products.stockUnit,
        baseUnit: products.baseUnit,
        quantityIssued: kitchenStock.quantityIssued,
        quantityRemaining: kitchenStock.quantityRemaining,
        expectedGuestCount: kitchenStock.expectedGuestCount,
        expectedServings: kitchenStock.expectedServings,
        menuId: kitchenStock.menuId,
        menuName: menus.name,
        mealType: menus.mealType,
        eventTag: kitchenStock.eventTag,
        status: kitchenStock.status,
        issuedAt: kitchenStock.issuedAt,
        notes: kitchenStock.notes,
      })
      .from(kitchenStock)
      .leftJoin(products, eq(kitchenStock.productId, products.id))
      .leftJoin(menus, eq(kitchenStock.menuId, menus.id))
      .where(and(...conditions))
      .orderBy(desc(kitchenStock.issuedAt))

    return {
      itemCount: rows.length,
      items: rows.map((r) => ({
        kitchenStockId: r.kitchenStockId,
        productId: r.productId,
        productName: r.productName,
        category: r.category,
        stockUnit: r.stockUnit,
        baseUnit: r.baseUnit,
        quantityIssued: parseFloat(r.quantityIssued),
        quantityRemaining: parseFloat(r.quantityRemaining),
        expectedGuestCount: r.expectedGuestCount,
        expectedServings: r.expectedServings,
        menuId: r.menuId,
        menuName: r.menuName,
        mealType: r.mealType,
        eventTag: r.eventTag,
        status: r.status,
        issuedAt: r.issuedAt,
        notes: r.notes,
      })),
    }
  })

  const matchProduct = matchProductDef.server(async (args: unknown) => {
    if (!branchId) return { matches: [] }
    const { description } = args as { description: string }
    const q = description.trim().toLowerCase()
    if (!q) return { matches: [] }

    // Only search products that have open kitchen_stock rows — the chef can't
    // reconcile against something that wasn't issued.
    const openStockRows = await db
      .select({ productId: kitchenStock.productId })
      .from(kitchenStock)
      .where(
        and(
          eq(kitchenStock.branchId, branchId),
          or(
            eq(kitchenStock.status, 'pending'),
            eq(kitchenStock.status, 'partial'),
          )!,
        ),
      )
    const openProductIds = Array.from(new Set(openStockRows.map((r) => r.productId)))
    if (openProductIds.length === 0) return { matches: [] }

    // Substring match against name AND category. Drizzle's ilike handles
    // case-insensitively.
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        stockUnit: products.stockUnit,
      })
      .from(products)
      .where(
        and(
          inArray(products.id, openProductIds),
          or(ilike(products.name, `%${q}%`), ilike(products.category, `%${q}%`)),
        ),
      )
      .limit(5)

    // Re-rank by leading-token match (chef says "carrots" → "Carrots" beats
    // "Baby Carrots"); then by length (shorter = more specific).
    const ranked = rows
      .map((r) => {
        const name = r.name.toLowerCase()
        const startsWith = name.startsWith(q)
        const wordStart = new RegExp(`(^|\\s)${escapeRegExp(q)}`, 'i').test(r.name)
        return {
          ...r,
          score: (startsWith ? 100 : 0) + (wordStart ? 50 : 0) - r.name.length,
        }
      })
      .sort((a, b) => b.score - a.score)

    return {
      matches: ranked.map((r) => ({
        productId: r.id,
        name: r.name,
        category: r.category,
        stockUnit: r.stockUnit,
      })),
    }
  })

  // Read-only action tool. Its result is the structured plan the UI renders
  // into a confirm card. The actual write happens via recordReconciliation()
  // server fn when the chef clicks 'Record'.
  const draftReconciliation = draftReconciliationDef.server(async (args: unknown) => {
    return { ...(args as Record<string, unknown>), accepted: true }
  })

  return [getKitchenStockTool, matchProduct, draftReconciliation]
}
