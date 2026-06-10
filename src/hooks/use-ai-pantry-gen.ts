import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { generatePantryFromMenus } from '@/server/ai-pantry-gen'
import { commitGeneratedPantry } from '@/server/pantry-gen'
import { pantryKeys } from '@/lib/query-manager/pantry/keys'
import { menuKeys } from '@/lib/query-manager/menus/keys'
import { useBranchContext } from '@/stores/branch-context'

type GenerateInput = Omit<Parameters<typeof generatePantryFromMenus>[0]['data'], 'branchId'>
type CommitInput = Omit<Parameters<typeof commitGeneratedPantry>[0]['data'], 'branchId'>

// Step 1: ask the AI to structure the user's recipes into a pantry proposal.
export function useGeneratePantry() {
  const branchId = useBranchContext((s) => s.activeBranchId)

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
  const branchId = useBranchContext((s) => s.activeBranchId)

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
