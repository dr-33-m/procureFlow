import { describe, it, expect } from 'vitest'
import {
  deriveParByProduct,
  ingredientQtyToStock,
  withDerivedPar,
  type GenDish,
  type GenProductSpec,
} from './pantry-gen'

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
    const dishes: GenDish[] = [
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
    const dishes: GenDish[] = [
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
    const dishes: GenDish[] = [
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
