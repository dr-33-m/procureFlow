import { describe, expect, it } from 'vitest'
import {
  deriveParByProduct,
  fallbackStructureRecipesFromText,
  ingredientQtyToStock,
  withDerivedPar,
} from './pantry-gen'
import type { GenDish, GenProductSpec } from './pantry-gen'

describe('ingredientQtyToStock', () => {
  it('passes stock quantities through unchanged', () => {
    expect(ingredientQtyToStock(2, 'stock', {})).toBe(2)
  })

  it('converts base units via baseUnitsPerStock', () => {
    // 50 g with 1000 g per kg = 0.05 kg
    expect(ingredientQtyToStock(50, 'base', { baseUnitsPerStock: 1000 })).toBeCloseTo(0.05)
  })

  it('converts serving units via servingSize and baseUnitsPerStock', () => {
    // 1 glass × 150 ml / 750 ml per bottle = 0.2 bottle
    expect(
      ingredientQtyToStock(1, 'serving', { servingSize: 150, baseUnitsPerStock: 750 }),
    ).toBeCloseTo(0.2)
  })

  it('returns 0 (not NaN) when a required conversion factor is missing', () => {
    expect(ingredientQtyToStock(50, 'base', { baseUnitsPerStock: null })).toBe(0)
    expect(ingredientQtyToStock(1, 'serving', { servingSize: 150, baseUnitsPerStock: null })).toBe(0)
  })
})

describe('deriveParByProduct', () => {
  const eggs: GenProductSpec = { tempKey: 'eggs', name: 'Eggs', category: 'Proteins', stockUnit: 'each' }
  const bacon: GenProductSpec = {
    tempKey: 'bacon',
    name: 'Bacon',
    category: 'Proteins',
    stockUnit: 'kg',
    baseUnit: 'g',
    baseUnitsPerStock: 1000,
  }

  it('sums an ingredient used across multiple dishes, weighted by servings/guest', () => {
    const dishes: Array<GenDish> = [
      {
        menuRef: 'm1',
        name: 'Full English',
        defaultServingsPerGuest: 1,
        ingredients: [{ productTempKey: 'eggs', quantityPerServing: 2, unit: 'stock' }],
      },
      {
        menuRef: 'm1',
        name: 'Omelette',
        defaultServingsPerGuest: 0.5,
        ingredients: [{ productTempKey: 'eggs', quantityPerServing: 1, unit: 'stock' }],
      },
    ]
    const par = deriveParByProduct([eggs], dishes)
    // 2×1.0 + 1×0.5 = 2.5 eggs/guest
    expect(par.get('eggs')).toBeCloseTo(2.5)
  })

  it('converts base-unit recipe quantities into stock units', () => {
    const dishes: Array<GenDish> = [
      {
        menuRef: 'm1',
        name: 'Full English',
        defaultServingsPerGuest: 1,
        ingredients: [{ productTempKey: 'bacon', quantityPerServing: 50, unit: 'base' }],
      },
    ]
    const par = deriveParByProduct([bacon], dishes)
    // 50 g / 1000 × 1 = 0.05 kg/guest
    expect(par.get('bacon')).toBeCloseTo(0.05)
  })

  it('withDerivedPar attaches a rounded par to each product spec', () => {
    const dishes: Array<GenDish> = [
      {
        menuRef: 'm1',
        name: 'Full English',
        defaultServingsPerGuest: 1,
        ingredients: [
          { productTempKey: 'eggs', quantityPerServing: 2, unit: 'stock' },
          { productTempKey: 'bacon', quantityPerServing: 50, unit: 'base' },
        ],
      },
    ]
    const enriched = withDerivedPar({ products: [eggs, bacon], dishes })
    expect(enriched.find((p) => p.tempKey === 'eggs')?.derivedParPerGuestStock).toBeCloseTo(2)
    expect(enriched.find((p) => p.tempKey === 'bacon')?.derivedParPerGuestStock).toBeCloseTo(0.05)
  })
})

describe('fallbackStructureRecipesFromText', () => {
  it('parses common quantified recipe lines into structured products and ingredients', () => {
    const structured = fallbackStructureRecipesFromText(
      [{ tempId: 'dinner', name: 'Dinner', mealType: 'dinner' }],
      [
        {
          menuRef: 'dinner',
          name: 'Chicken Dinner',
          defaultServingsPerGuest: 1,
          recipe: '180g chicken breast\n15ml olive oil\n2 eggs',
        },
      ],
    )

    expect(structured.products.map((p) => p.tempKey)).toEqual([
      'chicken-breast',
      'olive-oil',
      'egg',
    ])
    expect(structured.products.find((p) => p.tempKey === 'chicken-breast')).toMatchObject({
      stockUnit: 'kg',
      baseUnit: 'g',
      baseUnitsPerStock: 1000,
    })
    expect(structured.products.find((p) => p.tempKey === 'olive-oil')).toMatchObject({
      stockUnit: 'L',
      baseUnit: 'ml',
      baseUnitsPerStock: 1000,
    })
    expect(structured.dishes[0].ingredients).toEqual([
      { productTempKey: 'chicken-breast', quantityPerServing: 180, unit: 'base' },
      { productTempKey: 'olive-oil', quantityPerServing: 15, unit: 'base' },
      { productTempKey: 'egg', quantityPerServing: 2, unit: 'stock' },
    ])
  })

  it('keeps unquantified ingredients as zero-quantity links when requested', () => {
    const structured = fallbackStructureRecipesFromText(
      [{ tempId: 'mains', name: 'Mains', mealType: 'lunch' }],
      [
        {
          menuRef: 'mains',
          name: 'Roast Plate',
          defaultServingsPerGuest: 1,
          recipe: 'rosemary potatoes\nseasonal vegetables',
        },
      ],
      { keepZeroQty: true },
    )

    expect(structured.products.map((p) => p.name)).toEqual([
      'Rosemary Potato',
      'Seasonal Vegetables',
    ])
    expect(structured.dishes[0].ingredients).toEqual([
      { productTempKey: 'rosemary-potato', quantityPerServing: 0, unit: 'stock' },
      { productTempKey: 'seasonal-vegetables', quantityPerServing: 0, unit: 'stock' },
    ])
  })

  it('drops unquantified ingredients when zero-quantity links are not requested', () => {
    const structured = fallbackStructureRecipesFromText(
      [{ tempId: 'mains', name: 'Mains', mealType: 'lunch' }],
      [
        {
          menuRef: 'mains',
          name: 'Roast Plate',
          defaultServingsPerGuest: 1,
          recipe: 'rosemary potatoes',
        },
      ],
    )

    expect(structured.products).toEqual([])
    expect(structured.dishes[0].ingredients).toEqual([])
  })
})
