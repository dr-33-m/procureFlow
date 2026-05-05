import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ReceivingConfirmationState {
  // listId → array of confirmed itemIds (arrays serialize cleanly with JSON)
  confirmations: Record<string, string[]>
  confirmItem: (listId: string, itemId: string) => void
  clearItem: (listId: string, itemId: string) => void
  clearList: (listId: string) => void
}

export const useReceivingConfirmation = create<ReceivingConfirmationState>()(
  persist(
    (set) => ({
      confirmations: {},

      confirmItem: (listId, itemId) =>
        set((state) => {
          const existing = state.confirmations[listId] ?? []
          if (existing.includes(itemId)) return state
          return {
            confirmations: {
              ...state.confirmations,
              [listId]: [...existing, itemId],
            },
          }
        }),

      clearItem: (listId, itemId) =>
        set((state) => {
          const existing = state.confirmations[listId] ?? []
          return {
            confirmations: {
              ...state.confirmations,
              [listId]: existing.filter((id) => id !== itemId),
            },
          }
        }),

      clearList: (listId) =>
        set((state) => {
          const next = { ...state.confirmations }
          delete next[listId]
          return { confirmations: next }
        }),
    }),
    {
      name: 'receiving-confirmations',
    },
  ),
)
