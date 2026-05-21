import { and, eq, gte, inArray, isNotNull, notInArray } from 'drizzle-orm'
import {
  db,
  inventoryTransactions,
  kitchenReconciliationItems,
  kitchenReconciliations,
  products,
} from '@/db'
import { toStockQty } from '@/server/lib/pricing'

const DEFAULT_LOOKBACK_DAYS = 60
const DEFAULT_HALF_LIFE_DAYS = 30

// Reasons that are NOT representative of normal per-guest demand. Counting
// them would skew the learned rate (e.g. a 'waste-spoilage' day looks like
// extreme demand when it's actually loss).
const NOISE_REASONS = ['waste-spoilage', 'training', 'expiry-driven']

/**
 * Source of truth for per-guest demand rate, shared by both the issuance and
 * shopping-list agents. Prefers RECONCILE data from kitchen_reconciliation_items
 * (truth), falling back to ISSUE rows (plan-only, cold start), and finally
 * to the static products.parPerGuest field converted to stock units.
 *
 * mealType and eventTag segment the RECONCILE pool so a wedding doesn't
 * pollute the weekday-dinner average. ISSUE rows can't be segmented (we
 * don't capture meal type at issuance time) so they're treated as "any
 * service" for fallback purposes.
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
  productIds: Array<string>
  mealType?: string
  eventTag?: string
  lookbackDays?: number
  halfLifeDays?: number
}): Promise<Array<LearnedPerGuest>> {
  const { branchId, productIds, mealType, eventTag } = opts
  if (productIds.length === 0) return []

  const lookbackDays = opts.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const halfLifeDays = opts.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
  const sinceDateStr = since.toISOString().slice(0, 10)
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

  // ─── PASS 1 — Reconciliation rows (the truth) ──────────────────────────
  const reconConditions = [
    eq(kitchenReconciliations.branchId, branchId),
    inArray(kitchenReconciliationItems.productId, productIds),
    gte(kitchenReconciliations.serviceDate, sinceDateStr),
    notInArray(kitchenReconciliationItems.reason, NOISE_REASONS),
  ]
  if (mealType) reconConditions.push(eq(kitchenReconciliations.mealType, mealType))
  if (eventTag) reconConditions.push(eq(kitchenReconciliations.eventTag, eventTag))

  const reconRows = await db
    .select({
      productId: kitchenReconciliationItems.productId,
      quantityUsed: kitchenReconciliationItems.quantityUsed,
      actualGuestCount: kitchenReconciliations.actualGuestCount,
      perGuestUsedStock: kitchenReconciliationItems.perGuestUsedStock,
      reportedAt: kitchenReconciliations.reportedAt,
    })
    .from(kitchenReconciliationItems)
    .innerJoin(
      kitchenReconciliations,
      eq(kitchenReconciliationItems.reconciliationId, kitchenReconciliations.id),
    )
    .where(and(...reconConditions))

  const reconByProduct = new Map<string, typeof reconRows>()
  for (const r of reconRows) {
    if (!reconByProduct.has(r.productId)) reconByProduct.set(r.productId, [])
    reconByProduct.get(r.productId)!.push(r)
  }

  // ─── PASS 2 — Issuance rows (cold-start fallback) ──────────────────────
  // Only fetched for products that didn't get RECONCILE coverage.
  const productsNeedingIssuanceFallback = productIds.filter(
    (id) => !reconByProduct.has(id),
  )
  let issueRows: Array<{
    productId: string
    quantityStock: string
    guestCount: number | null
    createdAt: Date
  }> = []
  if (productsNeedingIssuanceFallback.length > 0) {
    issueRows = await db
      .select({
        productId: inventoryTransactions.productId,
        quantityStock: inventoryTransactions.quantityStock,
        guestCount: inventoryTransactions.guestCount,
        createdAt: inventoryTransactions.createdAt,
      })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.branchId, branchId),
          inArray(inventoryTransactions.productId, productsNeedingIssuanceFallback),
          eq(inventoryTransactions.type, 'ISSUE'),
          isNotNull(inventoryTransactions.guestCount),
          gte(inventoryTransactions.createdAt, since),
        ),
      )
  }

  const issueByProduct = new Map<string, typeof issueRows>()
  for (const r of issueRows) {
    if (!issueByProduct.has(r.productId)) issueByProduct.set(r.productId, [])
    issueByProduct.get(r.productId)!.push(r)
  }

  // ─── Build the final per-product result ────────────────────────────────
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

    // Try reconciliation first.
    const recon = reconByProduct.get(productId)
    if (recon && recon.length > 0) {
      let weightedSum = 0
      let weightTotal = 0
      for (const r of recon) {
        const perGuest = r.perGuestUsedStock
          ? parseFloat(r.perGuestUsedStock)
          : r.actualGuestCount > 0
            ? parseFloat(r.quantityUsed) / r.actualGuestCount
            : 0
        if (perGuest <= 0) continue
        const ageDays =
          (now - new Date(r.reportedAt).getTime()) / (24 * 60 * 60 * 1000)
        const weight = Math.pow(0.5, ageDays / halfLifeDays)
        weightedSum += weight * perGuest
        weightTotal += weight
      }
      if (weightTotal > 0) {
        const sampleSize = recon.length
        const confidence: LearnedPerGuest['confidence'] =
          sampleSize >= 10 ? 'high' : sampleSize >= 3 ? 'medium' : 'low'
        return {
          productId,
          perGuestStock: weightedSum / weightTotal,
          confidence,
          sampleSize,
          source: 'reconciliation' as const,
        }
      }
    }

    // Issuance fallback (plan-only, less accurate).
    const issues = issueByProduct.get(productId)
    if (issues && issues.length > 0) {
      let weightedSum = 0
      let weightTotal = 0
      for (const r of issues) {
        const guests = r.guestCount ?? 0
        if (guests <= 0) continue
        const qty = Math.abs(parseFloat(r.quantityStock))
        if (qty <= 0) continue
        const ageDays =
          (now - new Date(r.createdAt).getTime()) / (24 * 60 * 60 * 1000)
        const weight = Math.pow(0.5, ageDays / halfLifeDays)
        weightedSum += weight * (qty / guests)
        weightTotal += weight
      }
      if (weightTotal > 0) {
        const sampleSize = issues.length
        // Issuance data is always low confidence — it's what the manager
        // *planned*, not what was actually consumed. Manager bias is real.
        return {
          productId,
          perGuestStock: weightedSum / weightTotal,
          confidence: 'low' as const,
          sampleSize,
          source: 'issuance' as const,
        }
      }
    }

    // Static-par fallback.
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
