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

// ─── Deterministic recipe parsing fallback ──────────────────────────────────

type ParsedIngredientLine = {
  name: string
  quantityPerServing: number
  unit: IngredientUnit
  product: GenProductSpec
}

// Lightweight, dependency-free parser used only as a resilience fallback when
// the AI structuring step is unavailable. It intentionally handles the common
// "one ingredient per line" formats and keeps zero-quantity ingredients so menu
// creation never blocks just because a customer-facing menu omits amounts.
export function fallbackStructureRecipesFromText(
  _menus: Array<WizardMenuInput>,
  dishes: Array<WizardDishInput>,
  opts: { keepZeroQty?: boolean } = {},
): StructuredPantry {
  const keepZeroQty = opts.keepZeroQty ?? false
  const productsByKey = new Map<string, GenProductSpec>()

  const structuredDishes: Array<GenDish> = dishes
    .filter((d) => d.name.trim())
    .map((dish) => {
      const ingredients: Array<GenIngredient> = []
      for (const line of recipeLines(dish.recipe)) {
        const parsed = parseIngredientLine(line)
        if (!parsed) continue
        if (!keepZeroQty && parsed.quantityPerServing <= 0) continue
        productsByKey.set(parsed.product.tempKey, parsed.product)
        ingredients.push({
          productTempKey: parsed.product.tempKey,
          quantityPerServing: parsed.quantityPerServing,
          unit: parsed.unit,
        })
      }

      return {
        menuRef: dish.menuRef,
        name: dish.name.trim(),
        defaultServingsPerGuest: Number.isFinite(dish.defaultServingsPerGuest)
          ? dish.defaultServingsPerGuest
          : 1,
        ingredients,
      }
    })

  return {
    products: Array.from(productsByKey.values()),
    dishes: structuredDishes,
  }
}

function recipeLines(recipe: string): Array<string> {
  return recipe
    .split(/\r?\n|;/)
    .map((line) =>
      line
        .replace(/^\s*[-*•]\s*/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

function parseIngredientLine(line: string): ParsedIngredientLine | null {
  const qtyMatch = line.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.+)$/i,
  )

  if (!qtyMatch) {
    const name = cleanIngredientName(line)
    if (!name) return null
    const product = productSpecFor(name, inferMeasureKind(name))
    return { name, quantityPerServing: 0, unit: 'stock', product }
  }

  const quantity = parseQuantity(qtyMatch[1])
  let rest = qtyMatch[2].trim()
  const firstToken = rest.split(/\s+/)[0]?.replace(/[.,]/g, '').toLowerCase()
  const unitInfo = unitInfoFor(firstToken)

  if (unitInfo) {
    rest = rest.replace(/^\S+\s*/, '').replace(/^of\s+/i, '').trim()
  }

  const name = cleanIngredientName(rest || line)
  if (!name) return null

  if (!unitInfo) {
    const product = productSpecFor(name, 'count')
    return { name, quantityPerServing: quantity, unit: 'stock', product }
  }

  const product = productSpecFor(name, unitInfo.kind)
  return {
    name,
    quantityPerServing: quantity * unitInfo.multiplier,
    unit: unitInfo.unit,
    product,
  }
}

function parseQuantity(raw: string): number {
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fraction = raw.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

function unitInfoFor(token: string | undefined):
  | { kind: 'weight' | 'volume' | 'count'; unit: IngredientUnit; multiplier: number }
  | null {
  if (!token) return null

  if (['g', 'gram', 'grams'].includes(token)) return { kind: 'weight', unit: 'base', multiplier: 1 }
  if (['kg', 'kilogram', 'kilograms'].includes(token)) {
    return { kind: 'weight', unit: 'base', multiplier: 1000 }
  }
  if (['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'].includes(token)) {
    return { kind: 'volume', unit: 'base', multiplier: 1 }
  }
  if (['l', 'lt', 'liter', 'liters', 'litre', 'litres'].includes(token)) {
    return { kind: 'volume', unit: 'base', multiplier: 1000 }
  }
  if (['tsp', 'teaspoon', 'teaspoons'].includes(token)) {
    return { kind: 'volume', unit: 'base', multiplier: 5 }
  }
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(token)) {
    return { kind: 'volume', unit: 'base', multiplier: 15 }
  }
  if (
    ['each', 'ea', 'pc', 'pcs', 'piece', 'pieces', 'slice', 'slices', 'clove', 'cloves'].includes(
      token,
    )
  ) {
    return { kind: 'count', unit: 'stock', multiplier: 1 }
  }

  return null
}

function cleanIngredientName(raw: string): string {
  const cleaned = raw
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(to taste|as needed|optional)\b/gi, '')
    .replace(/[^\p{L}\p{N}\s&'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return titleCase(cleaned)
}

function productSpecFor(
  displayName: string,
  kind: 'weight' | 'volume' | 'count',
): GenProductSpec {
  const normalized = normalizeIngredientKey(displayName)
  const name = titleCase(normalized.replace(/-/g, ' '))
  const base: Pick<GenProductSpec, 'baseUnit' | 'baseUnitsPerStock'> =
    kind === 'weight'
      ? { baseUnit: 'g', baseUnitsPerStock: 1000 }
      : kind === 'volume'
        ? { baseUnit: 'ml', baseUnitsPerStock: 1000 }
        : { baseUnit: null, baseUnitsPerStock: null }

  return {
    tempKey: normalized,
    name,
    category: inferCategory(name),
    stockUnit: kind === 'weight' ? 'kg' : kind === 'volume' ? 'L' : 'each',
    ...base,
    servingUnit: null,
    servingSize: null,
  }
}

function inferMeasureKind(name: string): 'weight' | 'volume' | 'count' {
  const n = name.toLowerCase()
  if (/\b(oil|milk|cream|sauce|stock|broth|juice|wine|beer|water|vinegar)\b/.test(n)) {
    return 'volume'
  }
  if (/\b(chicken|beef|pork|lamb|fish|salmon|tuna|flour|sugar|rice|pasta|bacon)\b/.test(n)) {
    return 'weight'
  }
  return 'count'
}

function inferCategory(name: string): string {
  const n = name.toLowerCase()
  if (/\b(chicken|beef|pork|lamb|fish|salmon|tuna|egg|bacon|sausage|ham)\b/.test(n)) {
    return 'Proteins'
  }
  if (/\b(milk|cheese|butter|cream|yoghurt|yogurt)\b/.test(n)) return 'Dairy'
  if (/\b(rice|pasta|flour|bread|bun|roll|pastry|noodle)\b/.test(n)) return 'Grains'
  if (
    /\b(potato|carrot|onion|tomato|lettuce|cucumber|apple|banana|herb|rosemary|parsley|garlic|pepper)\b/.test(
      n,
    )
  ) {
    return 'Produce'
  }
  if (/\b(oil|olive|butter|margarine)\b/.test(n)) return 'Oils & Fats'
  if (/\b(wine|beer|juice|water|coffee|tea)\b/.test(n)) return 'Beverages'
  if (/\b(salt|sauce|vinegar|mustard|ketchup|mayonnaise|spice)\b/.test(n)) return 'Condiments'
  return 'General'
}

function normalizeIngredientKey(name: string): string {
  const normalizedWords = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => COMMON_SINGULARS[word] ?? word)
  return normalizedWords.join('-')
}

const COMMON_SINGULARS: Record<string, string> = {
  eggs: 'egg',
  tomatoes: 'tomato',
  potatoes: 'potato',
  leaves: 'leaf',
  berries: 'berry',
  strawberries: 'strawberry',
  slices: 'slice',
  cloves: 'clove',
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
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
