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
  quantity: number
}

export type DeductionItem = {
  productId: string
  productName: string
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  deductQty: number
  deductUnit: 'stock' | 'purchase'
}

interface IssuanceCartState {
  deductQtys: Record<string, number>
  deductionList: DeductionItem[]
  cartOpen: boolean
  station: string
  guestCount: number | null

  setDeductQty: (productId: string, qty: number) => void
  addToCart: (item: IssuanceInventoryItem) => void
  removeFromCart: (productId: string) => void
  updateDeductUnit: (productId: string, unit: 'stock' | 'purchase') => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void
  setStation: (station: string) => void
  setGuestCount: (count: number | null) => void
}

export const useIssuanceCart = create<IssuanceCartState>()(
  persist(
    (set, get) => ({
      deductQtys: {},
      deductionList: [],
      cartOpen: false,
      station: '',
      guestCount: null,

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
        set({ deductionList: [], deductQtys: {}, cartOpen: false }),

      setCartOpen: (open) => set({ cartOpen: open }),

      setStation: (station) => set({ station }),

      setGuestCount: (count) => set({ guestCount: count }),
    }),
    {
      name: 'issuance-cart-station',
      partialize: (state) => ({ station: state.station }),
    },
  ),
)
