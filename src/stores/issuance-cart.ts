import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type IssuanceInventoryItem = {
  productId: string
  name: string
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  category: string
  barcode: string | null
  parPerGuest: string | null
  parPerGuestUnit: string | null
  baseUnit: string | null
  servingUnit: string | null
  servingSize: string | null
  quantity: number
  learnedPerGuestStock: number | null
  learnedConfidence: 'low' | 'medium' | 'high' | null
  learnedSource: 'reconciliation' | 'issuance' | 'static-par' | 'none' | null
  learnedSampleSize: number
}

export type LineBasis =
  | 'learned-rate'
  | 'menu-recipe'
  | 'expiry-driven'
  | 'manual-override'
  | 'fallback-static-par'

export type DeductionItem = {
  productId: string
  productName: string
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  deductQty: number
  deductUnit: 'stock' | 'purchase'
  // Optional AI-proposed context — present only when items came from the agent.
  basis?: LineBasis
  lineReasoning?: string
}

// Top-level context for an AI-proposed batch of items. Set when the agent's
// propose_issuance card is "sent to cart"; cleared on submit or manual clear.
export type AIProposalContext = {
  summary: string
  reasoning: string
  menuId?: string
  eventTag?: string
  expectedServings?: number
}

interface IssuanceCartState {
  deductQtys: Record<string, number>
  deductionList: DeductionItem[]
  cartOpen: boolean
  station: string
  guestCount: number | null
  aiProposal: AIProposalContext | null

  setDeductQty: (productId: string, qty: number) => void
  addToCart: (item: IssuanceInventoryItem) => void
  removeFromCart: (productId: string) => void
  updateDeductUnit: (productId: string, unit: 'stock' | 'purchase') => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void
  setStation: (station: string) => void
  setGuestCount: (count: number | null) => void
  // AI integration: replace the current cart with a structured proposal.
  applyAIProposal: (data: {
    items: Array<{
      productId: string
      productName: string
      stockUnit: string
      purchaseUnit: string | null
      purchasePackSize: string | null
      quantityStock: number
      basis: LineBasis
      lineReasoning?: string
    }>
    guestCount: number
    expectedServings?: number
    summary: string
    reasoning: string
    menuId?: string
    eventTag?: string
  }) => void
}

export const useIssuanceCart = create<IssuanceCartState>()(
  persist(
    (set, get) => ({
      deductQtys: {},
      deductionList: [],
      cartOpen: false,
      station: '',
      guestCount: null,
      aiProposal: null,

      setDeductQty: (productId, qty) =>
        set((state) => ({
          deductQtys: { ...state.deductQtys, [productId]: qty },
        })),

      addToCart: (item) => {
        const qty = get().deductQtys[item.productId] ?? 0
        if (qty <= 0) return

        set((state) => {
          const existing = state.deductionList.find((d) => d.productId === item.productId)
          const newList = existing
            ? state.deductionList.map((d) =>
                d.productId === item.productId
                  ? { ...d, deductQty: d.deductQty + qty }
                  : d,
              )
            : [
                ...state.deductionList,
                {
                  productId: item.productId,
                  productName: item.name,
                  stockUnit: item.stockUnit,
                  purchaseUnit: item.purchaseUnit,
                  purchasePackSize: item.purchasePackSize,
                  deductQty: qty,
                  deductUnit: 'stock' as const,
                },
              ]

          return {
            deductionList: newList,
            deductQtys: { ...state.deductQtys, [item.productId]: 0 },
            cartOpen: true,
          }
        })
      },

      removeFromCart: (productId) =>
        set((state) => {
          const newList = state.deductionList.filter((d) => d.productId !== productId)
          return {
            deductionList: newList,
            cartOpen: newList.length > 0 ? state.cartOpen : false,
          }
        }),

      updateDeductUnit: (productId, unit) =>
        set((state) => ({
          deductionList: state.deductionList.map((d) =>
            d.productId === productId ? { ...d, deductUnit: unit } : d,
          ),
        })),

      clearCart: () =>
        set({ deductionList: [], deductQtys: {}, cartOpen: false, aiProposal: null }),

      setCartOpen: (open) => set({ cartOpen: open }),

      setStation: (station) => set({ station }),

      setGuestCount: (count) => set({ guestCount: count }),

      applyAIProposal: (data) => {
        set({
          deductionList: data.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            stockUnit: i.stockUnit,
            purchaseUnit: i.purchaseUnit,
            purchasePackSize: i.purchasePackSize,
            deductQty: i.quantityStock,
            deductUnit: 'stock' as const,
            basis: i.basis,
            lineReasoning: i.lineReasoning,
          })),
          deductQtys: {},
          guestCount: data.guestCount,
          aiProposal: {
            summary: data.summary,
            reasoning: data.reasoning,
            menuId: data.menuId,
            eventTag: data.eventTag,
            expectedServings: data.expectedServings,
          },
          cartOpen: true,
        })
      },
    }),
    {
      name: 'issuance-cart-station',
      partialize: (state) => ({ station: state.station }),
    },
  ),
)
