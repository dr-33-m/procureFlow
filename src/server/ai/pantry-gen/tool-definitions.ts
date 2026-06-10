import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

export const proposeStructuredPantryDef = toolDefinition({
  name: 'propose_structured_pantry',
  description:
    'Emit the structured pantry derived from the user-provided menu recipes. Call this EXACTLY ONCE after you have parsed every recipe line, consolidated duplicate ingredients across dishes into single products, and inferred each product\'s unit model. Do not invent ingredients that are not in the recipes, and do not compute par-per-guest (the server does that).',
  inputSchema: z.object({
    products: z
      .array(
        z.object({
          tempKey: z
            .string()
            .meta({
              description:
                'Stable key for this product, reused by every ingredient that refers to it. Use the normalized lowercase ingredient name (e.g. "chicken-breast").',
            }),
          name: z.string().meta({ description: 'Display name, e.g. "Chicken Breast".' }),
          category: z
            .string()
            .meta({ description: 'Best-fit category, e.g. "Proteins", "Dairy", "Grains", "Beverages".' }),
          stockUnit: z
            .string()
            .meta({
              description:
                'The unit the kitchen counts/issues at, e.g. "kg" for meat, "L" for oil, "each"/"loaf"/"tray" for countable items.',
            }),
          baseUnit: z
            .string()
            .nullable()
            .optional()
            .meta({
              description:
                'Smallest measure used in recipes, e.g. "g" for a kg-stocked item, "ml" for an L-stocked item. Null for purely countable items.',
            }),
          baseUnitsPerStock: z
            .number()
            .nullable()
            .optional()
            .meta({
              description:
                'How many base units make one stock unit, e.g. 1000 (g per kg), 1000 (ml per L). Required whenever baseUnit is set.',
            }),
          servingUnit: z
            .string()
            .nullable()
            .optional()
            .meta({ description: 'Optional human serving alias, e.g. "glass", "slice". Usually null.' }),
          servingSize: z
            .number()
            .nullable()
            .optional()
            .meta({ description: 'Base units per serving unit, e.g. 250 (ml per glass). Required whenever servingUnit is set.' }),
        }),
      )
      .meta({ description: 'Every distinct ingredient across all dishes, consolidated (no duplicates).' }),
    dishes: z
      .array(
        z.object({
          menuRef: z
            .string()
            .meta({ description: 'The tempId of the menu this dish belongs to (from the input).' }),
          name: z.string().meta({ description: 'Dish name (echo the input).' }),
          defaultServingsPerGuest: z
            .number()
            .meta({ description: 'Servings of this dish per guest (echo the input).' }),
          ingredients: z
            .array(
              z.object({
                productTempKey: z
                  .string()
                  .meta({ description: 'Matches a products[].tempKey above.' }),
                quantityPerServing: z
                  .number()
                  .meta({ description: 'Amount of this ingredient per single serving, in the unit below.' }),
                unit: z
                  .enum(['stock', 'base', 'serving'])
                  .meta({
                    description:
                      'Which level quantityPerServing is expressed in: "base" for "180g"/"15ml", "stock" for "2 eggs", "serving" for "1 glass".',
                  }),
              }),
            )
            .meta({ description: 'The parsed recipe lines for this dish.' }),
        }),
      )
      .meta({ description: 'Every dish from the input, each with its parsed, product-linked recipe.' }),
  }),
})
