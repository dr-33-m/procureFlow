import { db, inventoryTransactions, products } from '@/db'
import { and, eq, isNotNull, gte, inArray } from 'drizzle-orm'
import { toStockQty } from '@/server/lib/pricing'

const DEFAULT_LOOKBACK_DAYS = 60
const DEFAULT_HALF_LIFE_DAYS = 30

/**
 * Source of truth for per-guest demand rate, used by both the issuance and
 * shopping-list agents. Returns the *learned* per-guest rate (in stock units)
 * when enough recent guest-count data exists; otherwise falls back to the
 * static products.parPerGuest field converted to stock units.
 *
 * Phase 2: works from ISSUE rows with guestCount. The mealType/eventTag
 * params are accepted but cannot filter ISSUE rows (we don't capture meal
 * type at issuance time). Phase 3 extends this to prefer RECONCILE rows and
 * apply real segmentation; the API surface stays the same.
 */
export type LearnedPerGuest = {
  productId: string
  perGuestStock: number | null
  confidence: 'low' | 'medium' | 'high'
  sampleSize: number
  source: 'reconciliation' | 'issuance' | 'static-par' | 'none'
}

export async function getLearnedPerGuest(opts: {
  branchId: string
  productIds: string[]
  mealType?: string // accepted for forward-compat; ignored in Phase 2
  eventTag?: string // accepted for forward-compat; ignored in Phase 2
  lookbackDays?: number
  halfLifeDays?: number
}): Promise<LearnedPerGuest[]> {
  const { branchId, productIds } = opts
  if (productIds.length === 0) return []

  const lookbackDays = opts.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const halfLifeDays = opts.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
  const now = Date.now()

  const productRows = await db
    .select({
      id: products.id,
      stockUnit: products.stockUnit,
      purchaseUnit: products.purchaseUnit,
      purchasePackSize: products.purchasePackSize,
      purchasePrice: products.purchasePrice,
      baseUnit: products.baseUnit,
      baseUnitsPerStock: products.baseUnitsPerStock,
      servingUnit: products.servingUnit,
      servingSize: products.servingSize,
      parPerGuest: products.parPerGuest,
      parPerGuestUnit: products.parPerGuestUnit,
    })
    .from(products)
    .where(and(eq(products.branchId, branchId), inArray(products.id, productIds)))

  const productMap = new Map(productRows.map((p) => [p.id, p]))

  const txRows = await db
    .select({
      productId: inventoryTransactions.productId,
      type: inventoryTransactions.type,
      quantityStock: inventoryTransactions.quantityStock,
      guestCount: inventoryTransactions.guestCount,
      createdAt: inventoryTransactions.createdAt,
    })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.branchId, branchId),
        inArray(inventoryTransactions.productId, productIds),
        isNotNull(inventoryTransactions.guestCount),
        gte(inventoryTransactions.createdAt, since),
      ),
    )

  // Group by product. Prefer RECONCILE rows when present (Phase 3 will write
  // these); fall back to ISSUE rows in Phase 2.
  const byProduct = new Map<string, typeof txRows>()
  for (const r of txRows) {
    if (!byProduct.has(r.productId)) byProduct.set(r.productId, [])
    byProduct.get(r.productId)!.push(r)
  }

  return productIds.map((productId) => {
    const product = productMap.get(productId)
    if (!product) {
      return {
        productId,
        perGuestStock: null,
        confidence: 'low' as const,
        sampleSize: 0,
        source: 'none' as const,
      }
    }

    const rows = byProduct.get(productId) ?? []
    const reconcileRows = rows.filter((r) => r.type === 'RECONCILE')
    const issueRows = rows.filter((r) => r.type === 'ISSUE')
    const useRows = reconcileRows.length > 0 ? reconcileRows : issueRows
    const source: LearnedPerGuest['source'] =
      reconcileRows.length > 0 ? 'reconciliation' : issueRows.length > 0 ? 'issuance' : 'static-par'

    if (useRows.length > 0) {
      let weightedSum = 0
      let weightTotal = 0
      for (const r of useRows) {
        const guests = r.guestCount ?? 0
        if (guests <= 0) continue
        const qty = Math.abs(parseFloat(r.quantityStock))
        if (qty <= 0) continue
        const ageDays = (now - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000)
        const weight = Math.pow(0.5, ageDays / halfLifeDays)
        weightedSum += weight * (qty / guests)
        weightTotal += weight
      }

      if (weightTotal > 0) {
        const perGuestStock = weightedSum / weightTotal
        const sampleSize = useRows.length
        const confidence: LearnedPerGuest['confidence'] =
          sampleSize >= 10 ? 'high' : sampleSize >= 3 ? 'medium' : 'low'
        return { productId, perGuestStock, confidence, sampleSize, source }
      }
    }

    // Fall back to the static par-per-guest from the products table.
    if (!product.parPerGuest) {
      return {
        productId,
        perGuestStock: null,
        confidence: 'low' as const,
        sampleSize: 0,
        source: 'none' as const,
      }
    }

    const parVal = parseFloat(product.parPerGuest)
    if (parVal <= 0) {
      return {
        productId,
        perGuestStock: 0,
        confidence: 'low' as const,
        sampleSize: 0,
        source: 'static-par' as const,
      }
    }

    // Convert the par to stock units based on parPerGuestUnit.
    const unit = (product.parPerGuestUnit ?? 'stock') as 'stock' | 'base' | 'serving'
    const perGuestStock = toStockQty(parVal, unit, {
      stockUnit: product.stockUnit,
      purchaseUnit: product.purchaseUnit,
      purchasePackSize: product.purchasePackSize,
      purchasePrice: product.purchasePrice,
      baseUnit: product.baseUnit,
      baseUnitsPerStock: product.baseUnitsPerStock,
      servingUnit: product.servingUnit,
      servingSize: product.servingSize,
    })

    return {
      productId,
      perGuestStock,
      confidence: 'low' as const,
      sampleSize: 0,
      source: 'static-par' as const,
    }
  })
}
