import { describe, expect, it } from 'vitest'
import { coerceMenuDraft } from './menu-extract'

describe('coerceMenuDraft', () => {
  it('parses a clean draft, joining ingredients into a free-text recipe', () => {
    const draft = coerceMenuDraft({
      accepted: true,
      menus: [{ tempId: 'mains', name: 'Mains', mealType: 'dinner', eventTag: null }],
      dishes: [
        {
          menuRef: 'mains',
          name: 'Grilled Sirloin',
          defaultServingsPerGuest: 1,
          ingredients: ['180g sirloin steak', 'rosemary potatoes', 'seasonal vegetables'],
        },
      ],
    })

    expect(draft.menus).toEqual([
      { tempId: 'mains', name: 'Mains', mealType: 'dinner', eventTag: null },
    ])
    expect(draft.dishes).toHaveLength(1)
    expect(draft.dishes[0]).toMatchObject({
      menuRef: 'mains',
      name: 'Grilled Sirloin',
      defaultServingsPerGuest: 1,
      recipe: '180g sirloin steak\nrosemary potatoes\nseasonal vegetables',
    })
  })

  it('defaults an invalid meal type to lunch and coerces stringy numbers', () => {
    const draft = coerceMenuDraft({
      menus: [{ tempId: 'm1', name: 'Set Menu', mealType: 'brunch' }],
      dishes: [{ menuRef: 'm1', name: 'Soup', defaultServingsPerGuest: '2', ingredients: ['tomato'] }],
    })
    expect(draft.menus[0].mealType).toBe('lunch')
    expect(draft.dishes[0].defaultServingsPerGuest).toBe(2)
  })

  it('reattaches dishes whose menuRef does not match any menu to the first menu', () => {
    const draft = coerceMenuDraft({
      menus: [{ tempId: 'breakfast', name: 'Breakfast', mealType: 'breakfast' }],
      dishes: [{ menuRef: 'ghost-menu', name: 'Pancakes', ingredients: ['flour', 'eggs'] }],
    })
    expect(draft.dishes[0].menuRef).toBe('breakfast')
    expect(draft.dishes[0].defaultServingsPerGuest).toBe(1) // default when missing
  })

  it('synthesizes a menu when dishes exist but no menus were returned', () => {
    const draft = coerceMenuDraft({
      menus: [],
      dishes: [{ menuRef: 'whatever', name: 'Fries', ingredients: ['potato'] }],
    })
    expect(draft.menus).toHaveLength(1)
    expect(draft.dishes[0].menuRef).toBe(draft.menus[0].tempId)
  })

  it('accepts a pre-joined recipe string and synthesizes tempId from name', () => {
    const draft = coerceMenuDraft({
      menus: [{ name: 'Drinks List', mealType: 'drinks' }],
      dishes: [{ menuRef: 'drinks-list', name: 'House Red', recipe: '1 glass red wine' }],
    })
    expect(draft.menus[0].tempId).toBe('drinks-list')
    expect(draft.dishes[0].recipe).toBe('1 glass red wine')
  })

  it('drops malformed rows (no name) and tolerates non-array input', () => {
    const draft = coerceMenuDraft({
      menus: [{ tempId: 'm', name: 'M', mealType: 'lunch' }],
      dishes: [
        { menuRef: 'm', name: '', ingredients: ['x'] },
        { menuRef: 'm', name: 'Real Dish', ingredients: ['y'] },
        'garbage',
      ] as Array<unknown>,
    })
    expect(draft.dishes).toHaveLength(1)
    expect(draft.dishes[0].name).toBe('Real Dish')
  })

  it('returns empty draft for empty input', () => {
    expect(coerceMenuDraft({})).toEqual({ menus: [], dishes: [] })
  })
})
