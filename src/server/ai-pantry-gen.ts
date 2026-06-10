import { createServerFn } from '@tanstack/react-start'
import { chat, maxIterations } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import type {GenDish, GenProductSpec, PantryProposal, StructuredPantry, WizardDishInput, WizardMenuInput} from '@/lib/pantry-gen';
import { getAuthContext, requireRole } from '@/server/auth/context'
import { MODEL } from '@/server/ai/constants'
import { parseAIError } from '@/server/ai/errors'
import { PANTRY_GEN_SYSTEM_PROMPT } from '@/server/ai/pantry-gen/system-prompt'
import { createPantryGenTools } from '@/server/ai/pantry-gen/tool-implementations'
import {
  
  
  
  
  
  
  withDerivedPar
} from '@/lib/pantry-gen'

// Coerce the (untrusted) AI tool result into a StructuredPantry. The model can
// emit partial/loose JSON; anything malformed is dropped here and the review
// grid surfaces the gaps rather than crashing the commit.
function coerceStructured(raw: Record<string, unknown>): StructuredPantry {
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
                .filter((i) => i.productTempKey && i.quantityPerServing > 0)
            : [],
        }))
        .filter((d) => d.name)
    : []

  return { products, dishes }
}

export const generatePantryFromMenus = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      menus: Array<WizardMenuInput>
      dishes: Array<WizardDishInput>
    }) => data,
  )
  .handler(async ({ data }): Promise<PantryProposal> => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const { branchId: _branchId, menus, dishes } = data

    if (dishes.length === 0 || dishes.every((d) => !d.recipe.trim())) {
      throw new Error('Add at least one dish with a recipe before generating the pantry.')
    }

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

      for await (const chunk of stream) {
        if (chunk.type === 'TOOL_RESULT') {
          const result = chunk.result as Record<string, unknown> | null
          if (result && result.accepted && Array.isArray(result.products)) {
            structured = coerceStructured(result)
          }
        }
      }

      if (!structured || structured.products.length === 0) {
        throw new Error(
          'The AI could not structure a pantry from those recipes. Check that each dish lists ingredients with quantities (e.g. "180g chicken breast").',
        )
      }

      return {
        products: withDerivedPar(structured),
        dishes: structured.dishes,
        menus,
      }
    } catch (err) {
      throw new Error(parseAIError(err))
    }
  })
