// Multi-level packaging math.
//
// A product has up to three unit levels:
//   PURCHASE (case/box)  ──packSize──▶  STOCK (bottle/each)  ──baseUnitsPerStock──▶  BASE (ml/g)
//
// Inventory and all transaction quantities are ALWAYS in stockUnit. The helpers
// here derive prices at any level and convert quantities entered at PURCHASE or
// BASE level into STOCK before writing.
//
// Invariants:
//   - stockUnit is always defined.
//   - If purchaseUnit is null, purchasePackSize defaults to 1 and purchasePrice
//     IS the stock-unit price.
//   - If baseUnit is null, BASE-level conversions are not available.

export interface ProductPricing {
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  purchasePrice: string | null
  baseUnit: string | null
  baseUnitsPerStock: string | null
  servingUnit: string | null
  servingSize: string | null
}

export type PricingUnit = 'stock' | 'base' | 'purchase' | 'serving'

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function purchasePackSizeOrOne(p: ProductPricing): number {
  if (!p.purchaseUnit) return 1
  const n = num(p.purchasePackSize)
  return n > 0 ? n : 1
}

export function pricePerStockUnit(p: ProductPricing): number {
  return num(p.purchasePrice) / purchasePackSizeOrOne(p)
}

export function pricePerBaseUnit(p: ProductPricing): number | null {
  if (!p.baseUnit) return null
  const baseUnits = num(p.baseUnitsPerStock)
  if (baseUnits <= 0) return null
  return pricePerStockUnit(p) / baseUnits
}

// Convert a quantity entered at any level into stockUnit. Throws conceptually
// (returns NaN) if the level isn't supported by the product.
export function toStockQty(
  qty: number,
  unit: PricingUnit,
  p: ProductPricing,
): number {
  if (unit === 'stock') return qty
  if (unit === 'purchase') return qty * purchasePackSizeOrOne(p)
  if (unit === 'base') {
    const baseUnits = num(p.baseUnitsPerStock)
    if (baseUnits <= 0) return NaN
    return qty / baseUnits
  }
  if (unit === 'serving') {
    const servSize = num(p.servingSize)
    const baseUnits = num(p.baseUnitsPerStock)
    if (servSize <= 0 || baseUnits <= 0) return NaN
    return (qty * servSize) / baseUnits
  }
  return NaN
}

export function availablePricingUnits(p: ProductPricing): PricingUnit[] {
  const units: PricingUnit[] = ['stock']
  if (p.baseUnit) units.push('base')
  if (p.servingUnit && num(p.servingSize) > 0) units.push('serving')
  if (p.purchaseUnit) units.push('purchase')
  return units
}

// How many servings fit in one stock unit.
// Returns null if serving is not configured.
export function servingsPerStockUnit(p: ProductPricing): number | null {
  const servSize = num(p.servingSize)
  const baseUnits = num(p.baseUnitsPerStock)
  if (!p.servingUnit || servSize <= 0 || baseUnits <= 0) return null
  return baseUnits / servSize
}

// Display: "$15.00 / case (20 bottles × 500 ml) ≈ $0.75 / bottle"
//          "$1.80 / Litre" (no purchase pack, no base)
//          "$8.50 / each"
// Returns the per-stock-unit price given a supplier's price recorded at any level.
// priceUnit is 'purchase' | 'stock' | 'base'. Uses the product's pack/base ratios.
export function pricePerStockFromSupplier(
  supplierPrice: number,
  priceUnit: PricingUnit,
  p: ProductPricing,
): number {
  if (priceUnit === 'stock') return supplierPrice
  if (priceUnit === 'purchase') return supplierPrice / purchasePackSizeOrOne(p)
  if (priceUnit === 'base') {
    const baseUnits = num(p.baseUnitsPerStock)
    if (baseUnits <= 0) return NaN
    return supplierPrice * baseUnits
  }
  return NaN
}

export function formatPriceLabel(p: ProductPricing): string {
  const purchasePrice = num(p.purchasePrice)
  const stockPrice = pricePerStockUnit(p)

  if (p.purchaseUnit && purchasePrice > 0) {
    const packSize = purchasePackSizeOrOne(p)
    const packStr = `${packSize} ${p.stockUnit}${packSize === 1 ? '' : 's'}`
    const baseStr =
      p.baseUnit && num(p.baseUnitsPerStock) > 0
        ? ` × ${num(p.baseUnitsPerStock)} ${p.baseUnit}`
        : ''
    return `$${purchasePrice.toFixed(2)} / ${p.purchaseUnit} (${packStr}${baseStr}) ≈ $${stockPrice.toFixed(2)} / ${p.stockUnit}`
  }

  if (stockPrice > 0) {
    return `$${stockPrice.toFixed(2)} / ${p.stockUnit}`
  }
  return `— / ${p.stockUnit}`
}
