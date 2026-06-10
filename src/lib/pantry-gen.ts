// Shared shapes + pure math for the menu-first pantry generator.
//
// This module is imported by BOTH the server (generate + commit) and the client
// (wizard review grid live preview), so it must stay dependency-free — no DB,
// no server-only imports. Recipe ingredient units are only stock/base/serving,
// so the conversion math here is a trimmed copy of toStockQty (pricing.ts).

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'event'
export type IngredientUnit = 'stock' | 'base' | 'serving'

// ─── User-provided wizard input ──────────────────────────────────────────────
// The user supplies the menus and dishes; recipe content is free text per dish.
export type WizardMenuInput = {
  tempId: string
  name: string
  mealType: MealType
  eventTag?: string | null
}

export type WizardDishInput = {
  menuRef: string // WizardMenuInput.tempId
  name: string
  defaultServingsPerGuest: number
  recipe: string // free text, one ingredient per line e.g. "180g chicken breast"
}

// ─── AI structured proposal ──────────────────────────────────────────────────
export type GenProductSpec = {
  tempKey: string
  name: string
  category: string
  stockUnit: string
  baseUnit?: string | null
  baseUnitsPerStock?: number | null
  servingUnit?: string | null
  servingSize?: number | null
}

export type GenIngredient = {
  productTempKey: string
  quantityPerServing: number
  unit: IngredientUnit
}

export type GenDish = {
  menuRef: string
  name: string
  defaultServingsPerGuest: number
  ingredients: Array<GenIngredient>
}

// What the AI returns (no math, no DB).
export type StructuredPantry = {
  products: Array<GenProductSpec>
  dishes: Array<GenDish>
}

// Enriched proposal returned to the UI: products carry the deterministically
// derived par (stock units) so the review grid can show it immediately.
export type GenProductWithPar = GenProductSpec & {
  derivedParPerGuestStock: number
}

export type PantryProposal = {
  products: Array<GenProductWithPar>
  dishes: Array<GenDish>
  menus: Array<WizardMenuInput>
}

// ─── Pure par math ───────────────────────────────────────────────────────────

// Convert a recipe quantity into stock units. Trimmed copy of toStockQty for
// the three units a recipe ingredient can use. Returns 0 (not NaN) when a
// required conversion factor is missing so a half-specified product doesn't
// poison the derived par — the review grid surfaces the missing factor instead.
export function ingredientQtyToStock(
  qty: number,
  unit: IngredientUnit,
  p: Pick<GenProductSpec, 'baseUnitsPerStock' | 'servingSize'>,
): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0
  if (unit === 'stock') return qty
  const baseUnits = p.baseUnitsPerStock ?? 0
  if (unit === 'base') return baseUnits > 0 ? qty / baseUnits : 0
  // unit === 'serving'
  const servSize = p.servingSize ?? 0
  return servSize > 0 && baseUnits > 0 ? (qty * servSize) / baseUnits : 0
}

// Derive par-per-guest (stock units) for every product by summing its
// contribution across every dish that uses it:
//   Σ over dishes [ defaultServingsPerGuest × qtyPerServing(in stock) ]
export function deriveParByProduct(
  products: Array<GenProductSpec>,
  dishes: Array<GenDish>,
): Map<string, number> {
  const byKey = new Map(products.map((p) => [p.tempKey, p]))
  const par = new Map<string, number>()
  for (const p of products) par.set(p.tempKey, 0)

  for (const dish of dishes) {
    const servings = Number.isFinite(dish.defaultServingsPerGuest)
      ? dish.defaultServingsPerGuest
      : 1
    for (const ing of dish.ingredients) {
      const product = byKey.get(ing.productTempKey)
      if (!product) continue
      const perServingStock = ingredientQtyToStock(ing.quantityPerServing, ing.unit, product)
      par.set(ing.productTempKey, (par.get(ing.productTempKey) ?? 0) + servings * perServingStock)
    }
  }
  return par
}

// Attach derived par to each product spec.
export function withDerivedPar(structured: StructuredPantry): Array<GenProductWithPar> {
  const par = deriveParByProduct(structured.products, structured.dishes)
  return structured.products.map((p) => ({
    ...p,
    derivedParPerGuestStock: roundTo(par.get(p.tempKey) ?? 0, 4),
  }))
}

function roundTo(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
