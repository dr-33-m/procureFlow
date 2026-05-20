import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

export const getKitchenStockDef = toolDefinition({
  name: 'get_kitchen_stock',
  description:
    'List pending or partial kitchen stock items (issued from pantry, awaiting reconciliation). Returns each item with its kitchenStockId, product name, issued quantity, stock unit, planned guest count, and the menu/event it was issued for. Call this FIRST so you know what the chef can reconcile against.',
  inputSchema: z.object({
    status: z
      .enum(['pending', 'partial', 'all'])
      .optional()
      .meta({ description: 'Filter by status. Default: pending+partial.' }),
  }),
})

export const matchProductDef = toolDefinition({
  name: 'match_product',
  description:
    'Fuzzy-match a chef\'s natural-language reference ("the chicken", "those teabags") against pending kitchen stock. Use this to resolve free-form item names into kitchenStockId + productId before drafting a reconciliation. Returns up to 5 candidates ranked by name similarity and category proximity.',
  inputSchema: z.object({
    description: z
      .string()
      .meta({ description: 'The chef\'s text reference, e.g. "carrots" or "the bacon".' }),
  }),
})

export const draftReconciliationDef = toolDefinition({
  name: 'draft_reconciliation',
  description:
    "Present a structured reconciliation for the chef to confirm. The UI renders this as an inline card with a 'Record reconciliation' button — only that click writes to the database. Always call this BEFORE telling the chef the run is recorded. Include a reason code on every line.",
  inputSchema: z.object({
    summary: z
      .string()
      .meta({ description: 'One-sentence summary (e.g. "Friday dinner — 38 guests, 51 servings, 1 reorder spike on chicken").' }),
    serviceDate: z
      .string()
      .meta({ description: "ISO date 'YYYY-MM-DD' of the service being closed out." }),
    mealType: z
      .enum(['breakfast', 'lunch', 'dinner', 'drinks', 'event'])
      .meta({ description: 'Meal type for analytics segmentation.' }),
    eventTag: z
      .string()
      .optional()
      .meta({ description: 'Event tag if applicable (e.g. "wedding").' }),
    actualGuestCount: z
      .number()
      .meta({ description: 'Distinct paying covers served.' }),
    actualServings: z
      .number()
      .meta({ description: 'Total plates served (includes reorders/seconds). >= actualGuestCount.' }),
    notes: z
      .string()
      .optional()
      .meta({ description: "Free-form chef commentary. The next service's planning agent reads this back." }),
    items: z.array(
      z.object({
        kitchenStockId: z
          .string()
          .meta({ description: 'The kitchen_stock row id this line closes out.' }),
        productId: z.string().meta({ description: 'Product UUID.' }),
        productName: z.string().meta({ description: 'Product name for display in the confirm card.' }),
        stockUnit: z.string().meta({ description: 'Stock unit string for display.' }),
        quantityUsed: z
          .number()
          .meta({ description: 'Quantity actually consumed, in stock units.' }),
        quantityWaste: z
          .number()
          .optional()
          .meta({ description: 'Quantity wasted/discarded, in stock units. Default 0.' }),
        quantityLeftover: z
          .number()
          .optional()
          .meta({ description: 'Quantity left over for re-use, in stock units. Default 0.' }),
        reason: z
          .enum([
            'normal',
            'reorder-uplift',
            'expiry-driven',
            'substitution',
            'menu-change',
            'waste-spoilage',
            'waste-overcook',
            'training',
            'other',
          ])
          .meta({
            description:
              "Structured reason. 'normal' = ran as planned; 'reorder-uplift' = guests had seconds; 'expiry-driven' = used to consume expiring stock; 'substitution' = swapped from another ingredient; 'menu-change' = chef changed the dish; 'waste-spoilage' / 'waste-overcook' = loss; 'training' = staff meal; 'other' = use reasonNotes.",
          }),
        reasonNotes: z
          .string()
          .optional()
          .meta({ description: 'Short free-text explanation, especially when reason is "other" or "menu-change".' }),
      }),
    ),
  }),
})
