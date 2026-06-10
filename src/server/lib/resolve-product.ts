import { and, eq, ilike } from 'drizzle-orm'
import { db, inventory, products, productSuppliers } from '@/db'
import { toStockQty, type ProductPricing } from '@/server/lib/pricing'

// Resolve-or-create primitive: shared by the menu-first pantry generator (bulk
// commit) and the inline "create new ingredient" path in the recipe editor.
// Matches an existing product by case-insensitive name within the branch;
// otherwise creates the product (+ inventory + optional supplier). Keeps
// "recipes first, products follow" true everywhere. Auth + tier checks are the
// caller's responsibility.
//
// Lives in a server-only module (not pantry.ts) because it uses `db` directly —
// pantry.ts is imported by client hooks, where only createServerFn handlers get
// stripped from the bundle. A plain db-using export would leak postgres to the
// browser.
export type ProductResolveSpec = {
  name: string
  category?: string
  stockUnit: string
  initialQuantity?: number
  initialQuantityUnit?: 'stock' | 'purchase'
  parPerGuest?: number | null
  parPerGuestUnit?: 'stock' | 'base' | 'serving'
  parSource?: string
  purchaseUnit?: string | null
  purchasePackSize?: number | null
  purchasePrice?: number | null
  baseUnit?: string | null
  baseUnitsPerStock?: number | null
  servingUnit?: string | null
  servingSize?: number | null
  leadTimeDays?: number | null
  barcode?: string | null
  supplier?: {
    name: string
    pricePerUnit?: number | null
    priceUnit?: 'purchase' | 'stock' | 'base'
  } | null
}

export async function resolveOrCreateProduct(
  branchId: string,
  spec: ProductResolveSpec,
): Promise<{ productId: string; created: boolean }> {
  const name = spec.name.trim()
  if (!name) throw new Error('Product name is required')

  // ilike with no wildcards is a case-insensitive exact match.
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.branchId, branchId), ilike(products.name, name)))
    .limit(1)
    .then((r) => r[0])

  if (existing) return { productId: existing.id, created: false }

  const pricing: ProductPricing = {
    stockUnit: spec.stockUnit,
    purchaseUnit: spec.purchaseUnit ?? null,
    purchasePackSize: spec.purchasePackSize != null ? spec.purchasePackSize.toString() : null,
    purchasePrice: spec.purchasePrice != null ? spec.purchasePrice.toString() : null,
    baseUnit: spec.baseUnit ?? null,
    baseUnitsPerStock: spec.baseUnitsPerStock != null ? spec.baseUnitsPerStock.toString() : null,
    servingUnit: spec.servingUnit ?? null,
    servingSize: spec.servingSize != null ? spec.servingSize.toString() : null,
  }

  const stockQty = toStockQty(spec.initialQuantity ?? 0, spec.initialQuantityUnit ?? 'stock', pricing)

  const [product] = await db
    .insert(products)
    .values({
      branchId,
      name,
      stockUnit: spec.stockUnit,
      category: spec.category || 'General',
      parPerGuest: spec.parPerGuest != null ? spec.parPerGuest.toString() : null,
      parPerGuestUnit: spec.parPerGuestUnit ?? 'stock',
      parSource: spec.parSource ?? 'manual',
      purchaseUnit: spec.purchaseUnit || null,
      purchasePackSize: spec.purchasePackSize != null ? spec.purchasePackSize.toString() : null,
      purchasePrice: spec.purchasePrice != null ? spec.purchasePrice.toString() : null,
      baseUnit: spec.baseUnit || null,
      baseUnitsPerStock: spec.baseUnitsPerStock != null ? spec.baseUnitsPerStock.toString() : null,
      servingUnit: spec.servingUnit || null,
      servingSize: spec.servingSize != null ? spec.servingSize.toString() : null,
      leadTimeDays: spec.leadTimeDays ?? null,
      barcode: spec.barcode || null,
    })
    .returning()

  await db.insert(inventory).values({
    branchId,
    productId: product.id,
    quantity: (Number.isFinite(stockQty) ? stockQty : 0).toString(),
    updatedAt: new Date(),
  })

  if (spec.supplier?.name) {
    await db.insert(productSuppliers).values({
      productId: product.id,
      name: spec.supplier.name,
      pricePerUnit: spec.supplier.pricePerUnit != null ? spec.supplier.pricePerUnit.toString() : null,
      priceUnit: spec.supplier.priceUnit ?? 'stock',
    })
  }

  return { productId: product.id, created: true }
}
