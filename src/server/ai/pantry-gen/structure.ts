import { chat, maxIterations } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import type {
  GenDish,
  GenProductSpec,
  StructuredPantry,
  WizardDishInput,
  WizardMenuInput,
} from '@/lib/pantry-gen'
import { MODEL } from '@/server/ai/constants'
import { parseAIError } from '@/server/ai/errors'
import { PANTRY_GEN_SYSTEM_PROMPT } from '@/server/ai/pantry-gen/system-prompt'
import { createPantryGenTools } from '@/server/ai/pantry-gen/tool-implementations'

// Coerce the (untrusted) AI tool result into a StructuredPantry. The model can
// emit partial/loose JSON; anything malformed is dropped here. `keepZeroQty`
// controls whether ingredients with no usable quantity survive:
//   - pantry generation (par matters) drops them → false
//   - menu creation (the dish still lists the ingredient) keeps them → true
function coerceStructured(raw: Record<string, unknown>, keepZeroQty: boolean): StructuredPantry {
  const num = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
    return Number.isFinite(n) ? n : null
  }
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  const products: Array<GenProductSpec> = Array.isArray(raw.products)
    ? (raw.products as Array<Record<string, unknown>>)
        .map((p) => ({
          tempKey: str(p.tempKey) || str(p.name).toLowerCase().replace(/\s+/g, '-'),
          name: str(p.name),
          category: str(p.category) || 'General',
          stockUnit: str(p.stockUnit) || 'each',
          baseUnit: str(p.baseUnit) || null,
          baseUnitsPerStock: num(p.baseUnitsPerStock),
          servingUnit: str(p.servingUnit) || null,
          servingSize: num(p.servingSize),
        }))
        .filter((p) => p.name && p.tempKey)
    : []

  const dishes: Array<GenDish> = Array.isArray(raw.dishes)
    ? (raw.dishes as Array<Record<string, unknown>>)
        .map((d) => ({
          menuRef: str(d.menuRef),
          name: str(d.name),
          defaultServingsPerGuest: num(d.defaultServingsPerGuest) ?? 1,
          ingredients: Array.isArray(d.ingredients)
            ? (d.ingredients as Array<Record<string, unknown>>)
                .map((i) => ({
                  productTempKey: str(i.productTempKey),
                  quantityPerServing: num(i.quantityPerServing) ?? 0,
                  unit: (['stock', 'base', 'serving'].includes(str(i.unit))
                    ? str(i.unit)
                    : 'base') as GenDish['ingredients'][number]['unit'],
                }))
                .filter((i) =>
                  keepZeroQty ? !!i.productTempKey : i.productTempKey && i.quantityPerServing > 0,
                )
            : [],
        }))
        .filter((d) => d.name)
    : []

  return { products, dishes }
}

// Structure free-text dish recipes into a deduplicated product list + product-
// linked dish ingredients via the pantry-gen AI. Shared by the pantry generator
// (generatePantryFromMenus) and menu creation (createMenusFromRecipes). No DB
// access — pure AI structuring; callers persist the result.
export async function structureRecipes(
  menus: Array<WizardMenuInput>,
  dishes: Array<WizardDishInput>,
  opts: { keepZeroQty?: boolean } = {},
): Promise<StructuredPantry> {
  const userContent = [
    'Structure the pantry from these menus and dish recipes. Call propose_structured_pantry exactly once.',
    '',
    JSON.stringify(
      {
        menus: menus.map((m) => ({
          tempId: m.tempId,
          name: m.name,
          mealType: m.mealType,
          eventTag: m.eventTag ?? null,
        })),
        dishes: dishes.map((d) => ({
          menuRef: d.menuRef,
          name: d.name,
          defaultServingsPerGuest: d.defaultServingsPerGuest,
          recipe: d.recipe,
        })),
      },
      null,
      2,
    ),
  ].join('\n')

  const tools = createPantryGenTools()

  try {
    const stream = chat({
      adapter: openRouterText(MODEL),
      systemPrompts: [PANTRY_GEN_SYSTEM_PROMPT],
      messages: [{ role: 'user', content: userContent }],
      tools,
      agentLoopStrategy: maxIterations(3),
    })

    let structured: StructuredPantry | null = null
    let runError: unknown = null

    for await (const chunk of stream) {
      if (chunk.type === 'RUN_ERROR') runError = chunk
      if (chunk.type === 'TOOL_RESULT') {
        const result = chunk.result as Record<string, unknown> | null
        if (result && result.accepted && Array.isArray(result.products)) {
          structured = coerceStructured(result, opts.keepZeroQty ?? false)
        }
      }
    }

    // Provider errors (rate limit, outage, …) arrive as a RUN_ERROR chunk, not a
    // throw — surface them instead of the generic "could not structure" message.
    if (runError) throw new Error(parseAIError(runError))

    if (!structured || structured.products.length === 0) {
      throw new Error(
        'The AI could not structure a pantry from those recipes. Check that each dish lists ingredients (e.g. "180g chicken breast").',
      )
    }

    return structured
  } catch (err) {
    throw new Error(parseAIError(err))
  }
}
