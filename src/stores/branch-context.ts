import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BranchOption = {
  id: string
  name: string
}

interface BranchContextState {
  activeBranchId: string
  activeBranchName: string
  branches: BranchOption[]
  setActiveBranch: (id: string) => void
  setBranches: (branches: BranchOption[]) => void
  reset: () => void
}

export const useBranchContext = create<BranchContextState>()(
  persist(
    (set, get) => ({
      activeBranchId: '',
      activeBranchName: '',
      branches: [],
      setActiveBranch: (id: string) => {
        const branch = get().branches.find((b) => b.id === id)
        set({ activeBranchId: id, activeBranchName: branch?.name ?? '' })
      },
      setBranches: (branches: BranchOption[]) => {
        set((state) => {
          // If current active branch is still in the new list, keep selection but sync the name
          const validBranch = branches.find((b) => b.id === state.activeBranchId)
          if (validBranch) {
            return { branches, activeBranchName: validBranch.name }
          }
          // Otherwise default to the first branch
          const first = branches[0]
          return {
            branches,
            activeBranchId: first?.id ?? '',
            activeBranchName: first?.name ?? '',
          }
        })
      },
      reset: () =>
        set({ activeBranchId: '', activeBranchName: '', branches: [] }),
    }),
    {
      name: 'procureflow-branch-context',
      partialize: (state) => ({
        activeBranchId: state.activeBranchId,
        activeBranchName: state.activeBranchName,
      }),
    },
  ),
)
