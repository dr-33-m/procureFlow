import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

export const listMenusDef = toolDefinition({
  name: 'list_menus',
  description:
    'List menus configured for this branch. Optionally filter by meal type or event tag (e.g. "wedding"). Returns menus with ids you can pass to get_menu_recipe.',
  inputSchema: z.object({
    mealType: z
      .enum(['breakfast', 'lunch', 'dinner', 'drinks', 'event'])
      .optional()
      .meta({ description: 'Filter to a single meal type.' }),
    eventTag: z
      .string()
      .optional()
      .meta({ description: 'Filter to menus tagged with a specific event (e.g. "wedding").' }),
  }),
})

export const getMenuRecipeDef = toolDefinition({
  name: 'get_menu_recipe',
  description:
    'Get the full recipe for a menu: its dishes plus each dish\'s ingredients with quantity-per-serving and unit. Use this BEFORE proposing issuance so you know the menu baseline.',
  inputSchema: z.object({
    menuId: z.string().meta({ description: 'The menu id from list_menus.' }),
  }),
})

export const getPantryStockDef = toolDefinition({
  name: 'get_pantry_stock',
  description:
    'Get current pantry inventory (post-issuance balances). Returns each product\'s on-hand quantity in stock units, its category, stock/base/serving units, and the static par-per-guest (fallback when no learned data exists).',
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .meta({ description: 'Filter by product category.' }),
    productIds: z
      .array(z.string())
      .optional()
      .meta({ description: 'Filter to specific product ids (e.g. the ones from a menu recipe).' }),
  }),
})

export const getExpiringInventoryDef = toolDefinition({
  name: 'get_expiring_inventory',
  description:
    'List inventory batches expiring within `daysOut` days. Surfaces stock the kitchen should prioritise using. Returns empty when no batches have a best-before date set (cold start). Use this to bias proposals toward expiring stock and flag urgent-use lines.',
  inputSchema: z.object({
    daysOut: z
      .number()
      .optional()
      .meta({ description: 'Days from now to look ahead. Default 5.' }),
  }),
})

export const getLearnedPerGuestDef = toolDefinition({
  name: 'get_learned_per_guest',
  description:
    'Get the per-guest demand rate (in stock units) for one or more products. Returns the *learned* rate from reconciliation/issuance history with confidence and sample size; falls back to the static par-per-guest when there isn\'t enough data. Use this to anchor proposed quantities in reality.',
  inputSchema: z.object({
    productIds: z
      .array(z.string())
      .meta({ description: 'Product ids to look up.' }),
    mealType: z
      .enum(['breakfast', 'lunch', 'dinner', 'drinks', 'event'])
      .optional()
      .meta({ description: 'Segment by meal type (only effective once reconciliation data exists).' }),
    eventTag: z
      .string()
      .optional()
      .meta({ description: 'Segment by event tag (only effective once reconciliation data exists).' }),
    lookbackDays: z
      .number()
      .optional()
      .meta({ description: 'How many days of history to weigh. Default 60.' }),
  }),
})

export const proposeIssuanceDef = toolDefinition({
  name: 'propose_issuance',
  description:
    'Present a finalized issuance proposal for the manager to review. Call this once you have computed quantities for all needed items and have your reasoning ready. The user will see the proposal alongside per-line basis tags and your reasoning, then approve via the deduction cart.',
  inputSchema: z.object({
    summary: z
      .string()
      .meta({ description: 'One-sentence summary of the service (e.g. "Dinner for 40 guests, Standard Dinner menu, single night").' }),
    reasoning: z
      .string()
      .meta({ description: 'Multi-line free-text explanation of how you arrived at the totals. Shown to the manager.' }),
    expectedGuestCount: z
      .number()
      .meta({ description: 'Distinct guests the manager planned for.' }),
    expectedServings: z
      .number()
      .optional()
      .meta({ description: 'Total servings expected — accounts for reorders/seconds. Often = guests for cold start.' }),
    menuId: z
      .string()
      .optional()
      .meta({ description: 'Source menu id if this proposal came from a specific menu.' }),
    eventTag: z
      .string()
      .optional()
      .meta({ description: 'Event tag (e.g. "wedding") — segments learned rates downstream.' }),
    items: z.array(
      z.object({
        productId: z.string().meta({ description: 'Product UUID' }),
        productName: z.string().meta({ description: 'Product name for display.' }),
        quantityStock: z
          .number()
          .meta({ description: 'Quantity to issue, IN STOCK UNITS. The cart converts to purchase units at the user\'s request.' }),
        stockUnit: z.string().meta({ description: 'The stock unit string (e.g. "kg", "loaf").' }),
        basis: z
          .enum(['learned-rate', 'menu-recipe', 'expiry-driven', 'manual-override', 'fallback-static-par'])
          .meta({
            description:
              'Per-line basis tag. Use learned-rate when get_learned_per_guest had medium+ confidence; menu-recipe for cold-start from recipes; expiry-driven when proposing extra to consume expiring stock; fallback-static-par when nothing better was available.',
          }),
        lineReasoning: z
          .string()
          .optional()
          .meta({ description: 'Short per-line note (e.g. "200g/serving × 40 × 1.34 reorder uplift = 10.7kg").' }),
      }),
    ),
  }),
})
