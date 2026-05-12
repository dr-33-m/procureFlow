import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

export const getPantryStockDef = toolDefinition({
  name: 'get_pantry_stock',
  description:
    'Get current pantry inventory levels for a branch. Can filter by category or show only low/out-of-stock items. Returns product name, category, current stock quantity, stock unit, par level per guest, and pricing info.',
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .meta({ description: 'Filter by product category (e.g., "Dairy", "Beverages", "Proteins")' }),
    lowStockOnly: z
      .boolean()
      .optional()
      .meta({ description: 'If true, only return items with stock below 10 units' }),
  }),
})

export const getConsumptionHistoryDef = toolDefinition({
  name: 'get_consumption_history',
  description:
    'Get historical consumption data from issuance records. Shows how much of each product was used and for how many guests, enabling per-guest rate calculations. Use this to understand usage patterns.',
  inputSchema: z.object({
    lookbackDays: z
      .number()
      .optional()
      .meta({ description: 'How many days of history to look back. Default 90.' }),
    category: z
      .string()
      .optional()
      .meta({ description: 'Filter consumption history by product category' }),
  }),
})

export const getProductCatalogDef = toolDefinition({
  name: 'get_product_catalog',
  description:
    'Search the product catalog by name or category. Returns product details including pricing, units, and supplier information.',
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .meta({ description: 'Search term to match against product name' }),
    category: z
      .string()
      .optional()
      .meta({ description: 'Filter by product category' }),
  }),
})

export const getOpenOrdersDef = toolDefinition({
  name: 'get_open_orders',
  description:
    'Get quantities already on order from open shopping lists (pending, shopping, in review, or on hold). Helps avoid ordering duplicate items.',
  inputSchema: z.object({}),
})

export const getPreviousListsDef = toolDefinition({
  name: 'get_previous_lists',
  description:
    'Get summaries of recent completed shopping lists, including items, quantities, and the context they were created for (guest count, period, meals). Useful for understanding ordering patterns.',
  inputSchema: z.object({
    limit: z
      .number()
      .optional()
      .meta({ description: 'Number of recent lists to retrieve. Default 3.' }),
  }),
})

export const computeItemRestockDef = toolDefinition({
  name: 'compute_item_restock',
  description:
    'Compute a statistical restock suggestion for a specific product based on historical consumption and par levels. Returns suggested quantity, urgency, data source (history or par), and safety stock.',
  inputSchema: z.object({
    productId: z.string().meta({ description: 'The product ID to compute restock for' }),
    expectedGuestCount: z.number().meta({ description: 'Total expected guests for the period' }),
    periodDays: z.number().meta({ description: 'Number of days in the procurement period' }),
  }),
})

export const generateShoppingListDef = toolDefinition({
  name: 'generate_shopping_list',
  description:
    'Present a finalized shopping list to the user for review. Call this when you have gathered enough context and computed quantities for all needed items. The user will be able to accept, modify, or reject individual items before adding them to their shopping list.',
  inputSchema: z.object({
    summary: z
      .string()
      .meta({
        description:
          'Brief summary of the list context (e.g., "Weekly list for 60 guests, full-board, 7 days")',
      }),
    items: z.array(
      z.object({
        productId: z.string().meta({ description: 'Product UUID' }),
        productName: z.string().meta({ description: 'Product name for display' }),
        category: z.string().meta({ description: 'Product category' }),
        quantity: z.number().meta({ description: 'Suggested quantity in stock units' }),
        stockUnit: z
          .string()
          .meta({ description: 'The stock unit (e.g., "kg", "bottle", "loaf")' }),
        purchaseUnit: z
          .string()
          .optional()
          .meta({ description: 'Purchase unit if different from stock (e.g., "case")' }),
        purchasePackSize: z
          .number()
          .optional()
          .meta({ description: 'How many stock units per purchase unit' }),
        pricePerStockUnit: z
          .number()
          .meta({ description: 'Price per stock unit in the branch currency' }),
        reason: z
          .string()
          .meta({
            description:
              'Brief explanation of why this quantity (e.g., "Based on 2.5 units/guest × 60 guests, minus 30 on hand")',
          }),
        urgency: z
          .enum(['critical', 'soon', 'ok'])
          .meta({ description: 'How urgent this item is based on current stock and lead time' }),
      }),
    ),
  }),
})
