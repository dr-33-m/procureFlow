import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

export const proposeMenuDraftDef = toolDefinition({
  name: 'propose_menu_draft',
  description:
    'Emit the menus and dishes you read from the menu image(s). Call this EXACTLY ONCE after reading every section. Group each dish under the menu/section it appears in. Do not invent dishes or ingredients that are not visible, and do not invent quantities the menu does not print.',
  inputSchema: z.object({
    menus: z
      .array(
        z.object({
          tempId: z
            .string()
            .meta({
              description:
                "Stable id for this menu/section, reused by its dishes' menuRef. Use the normalized lowercase menu name, e.g. \"breakfast-buffet\".",
            }),
          name: z
            .string()
            .meta({ description: 'Menu or section name as printed, e.g. "Breakfast Buffet", "Mains".' }),
          mealType: z
            .enum(['breakfast', 'lunch', 'dinner', 'drinks', 'event'])
            .meta({ description: 'Best-fit meal type for this menu/section.' }),
          eventTag: z
            .string()
            .nullable()
            .optional()
            .meta({
              description:
                'Optional event/occasion tag if the menu names one (e.g. "wedding"). Usually null.',
            }),
        }),
      )
      .meta({ description: 'Every menu or section visible in the image(s).' }),
    dishes: z
      .array(
        z.object({
          menuRef: z
            .string()
            .meta({ description: 'The tempId of the menu/section this dish belongs to.' }),
          name: z.string().meta({ description: 'Dish name as printed.' }),
          defaultServingsPerGuest: z
            .number()
            .meta({ description: 'Servings of this dish per guest. Use 1 unless the menu implies otherwise.' }),
          ingredients: z
            .array(z.string())
            .meta({
              description:
                'One ingredient per entry, transcribed from the dish name/description. Include a quantity ONLY if the menu prints one (e.g. "180g chicken breast"); otherwise just the ingredient name (e.g. "chicken breast"). Empty array if none can be read.',
            }),
        }),
      )
      .meta({ description: 'Every dish visible, linked to its menu via menuRef.' }),
  }),
})
