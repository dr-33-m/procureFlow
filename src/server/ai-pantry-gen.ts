import { createServerFn } from '@tanstack/react-start'
import type { PantryProposal, WizardDishInput, WizardMenuInput } from '@/lib/pantry-gen'
import { getAuthContext, requireRole } from '@/server/auth/context'
import { structureRecipes } from '@/server/ai/pantry-gen/structure'
import { withDerivedPar } from '@/lib/pantry-gen'

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

    const { menus, dishes } = data

    if (dishes.length === 0 || dishes.every((d) => !d.recipe.trim())) {
      throw new Error('Add at least one dish with a recipe before generating the pantry.')
    }

    const structured = await structureRecipes(menus, dishes)

    return {
      products: withDerivedPar(structured),
      dishes: structured.dishes,
      menus,
    }
  })
