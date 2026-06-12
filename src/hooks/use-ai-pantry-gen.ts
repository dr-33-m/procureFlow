import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { generatePantryFromMenus } from '@/server/ai-pantry-gen'
import { commitGeneratedPantry } from '@/server/pantry-gen'
import { extractMenuFromImages } from '@/server/ai-menu-extract'
import { applyPantryFromMenus, derivePantryFromMenus } from '@/server/pantry-from-menus'
import { pantryKeys } from '@/lib/query-manager/pantry/keys'
import { menuKeys } from '@/lib/query-manager/menus/keys'
import { useActiveBranchId } from '@/hooks/use-active-branch'

type GenerateInput = Omit<Parameters<typeof generatePantryFromMenus>[0]['data'], 'branchId'>
type CommitInput = Omit<Parameters<typeof commitGeneratedPantry>[0]['data'], 'branchId'>
type ExtractInput = Parameters<typeof extractMenuFromImages>[0]['data']
type DeriveInput = Omit<Parameters<typeof derivePantryFromMenus>[0]['data'], 'branchId'>
type ApplyInput = Omit<Parameters<typeof applyPantryFromMenus>[0]['data'], 'branchId'>

// Step 0 (optional): read a menu image into an editable draft. Writes nothing —
// the result seeds the wizard's input step, then generate + commit take over.
export function useExtractMenu() {
  return useMutation({
    mutationFn: (data: ExtractInput) => extractMenuFromImages({ data }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to read menu image')
    },
  })
}

// Step 1: ask the AI to structure the user's recipes into a pantry proposal.
export function useGeneratePantry() {
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (data: GenerateInput) => generatePantryFromMenus({ data: { ...data, branchId } }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to generate pantry')
    },
  })
}

// Step 2: persist the reviewed proposal (products → menus → dishes → recipes).
export function useCommitPantry() {
  const queryClient = useQueryClient()
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (data: CommitInput) => commitGeneratedPantry({ data: { ...data, branchId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success(
        `Created ${result.productsCreated} products, ${result.menus} menus, ${result.dishes} dishes`,
      )
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save pantry')
    },
  })
}

// "From existing menus" — derive a pantry proposal deterministically from menus
// already in the org (no AI; their recipes are already structured).
export function useDerivePantryFromMenus() {
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (data: DeriveInput) => derivePantryFromMenus({ data: { ...data, branchId } }),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to read menus')
    },
  })
}

// Apply the reviewed pantry: update the existing menu products' par + pricing +
// opening stock (does not create menus/dishes).
export function useApplyPantryFromMenus() {
  const queryClient = useQueryClient()
  const branchId = useActiveBranchId()

  return useMutation({
    mutationFn: (data: ApplyInput) => applyPantryFromMenus({ data: { ...data, branchId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.all })
      queryClient.invalidateQueries({ queryKey: menuKeys.all })
      toast.success(`Updated ${result.updated} products from menus`)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update pantry')
    },
  })
}
