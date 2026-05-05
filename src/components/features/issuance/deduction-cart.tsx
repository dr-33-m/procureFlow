import { useState } from 'react'
import { ShoppingCart, ChevronUp, X, PackageMinus, Loader2, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIssuanceCart } from '@/stores/issuance-cart'
import { useIssueStock } from '@/hooks/use-issuance'
import { useStations, useCreateStation } from '@/hooks/use-stations'

export function DeductionCart() {
  const {
    deductionList,
    cartOpen,
    station,
    guestCount,
    removeFromCart,
    clearCart,
    setCartOpen,
    setStation,
    setGuestCount,
    updateDeductUnit,
  } = useIssuanceCart()

  const issueMutation = useIssueStock()
  const { data: stations = [] } = useStations()
  const createStationMutation = useCreateStation()
  const [newStationName, setNewStationName] = useState('')

  const handleDeduct = () => {
    if (deductionList.length === 0) return
    issueMutation.mutate(
      {
        guestCount: guestCount ?? undefined,
        items: deductionList.map((i) => ({
          productId: i.productId,
          deductQty: i.deductQty,
          deductUnit: i.deductUnit,
          station,
        })),
      },
      { onSuccess: clearCart },
    )
  }

  const handleAddStation = () => {
    const name = newStationName.trim()
    if (!name) return
    createStationMutation.mutate(name, {
      onSuccess: (created) => {
        setNewStationName('')
        setStation(created.name)
      },
    })
  }

  const incrementGuests = (delta: number) => {
    setGuestCount(Math.max(1, (guestCount ?? 0) + delta))
  }

  if (!cartOpen) {
    return (
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        <ShoppingCart className="h-4 w-4" />
        Deduction Cart
        {deductionList.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
            {deductionList.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="w-[26rem] rounded-xl border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span className="font-semibold text-sm">
            Deduction Cart ({deductionList.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCartOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      {/* Guest count stepper */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Serving guests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => incrementGuests(-10)}
              className="flex h-8 w-10 items-center justify-center rounded-md border text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-40"
              disabled={(guestCount ?? 0) <= 10}
            >
              −10
            </button>
            <button
              type="button"
              onClick={() => incrementGuests(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border text-base font-semibold hover:bg-muted transition-colors disabled:opacity-40"
              disabled={(guestCount ?? 0) <= 1}
            >
              −
            </button>
            <span className="w-12 text-center text-sm font-bold tabular-nums">
              {guestCount ?? '—'}
            </span>
            <button
              type="button"
              onClick={() => incrementGuests(1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border text-base font-semibold hover:bg-muted transition-colors"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => incrementGuests(10)}
              className="flex h-8 w-10 items-center justify-center rounded-md border text-xs font-semibold hover:bg-muted transition-colors"
            >
              +10
            </button>
            {guestCount !== null && (
              <button
                type="button"
                onClick={() => setGuestCount(null)}
                className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Clear guest count"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Station selector */}
      <div className="border-b px-4 py-3 space-y-2">
        <Select value={station} onValueChange={setStation}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={stations.length === 0 ? 'No stations yet' : 'Select station'} />
          </SelectTrigger>
          <SelectContent>
            {stations.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
            {stations.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No stations yet — add one below
              </div>
            )}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="New station name"
            value={newStationName}
            onChange={(e) => setNewStationName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStation()}
            className="h-7 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 shrink-0"
            onClick={handleAddStation}
            disabled={!newStationName.trim() || createStationMutation.isPending}
          >
            {createStationMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Items */}
      <div className="max-h-52 overflow-y-auto divide-y">
        {deductionList.map((item) => {
          const hasPurchaseUnit = !!item.purchaseUnit
          const packSize = item.purchasePackSize ? parseFloat(item.purchasePackSize) : null
          const isPackMode = item.deductUnit === 'purchase'
          const stockEquiv =
            isPackMode && packSize ? item.deductQty * packSize : null

          return (
            <div key={item.productId} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {item.deductQty}{' '}
                        {isPackMode ? item.purchaseUnit : item.stockUnit}
                      </p>
                      {hasPurchaseUnit && (
                        <div className="flex overflow-hidden rounded-full border text-xs font-medium">
                          <button
                            type="button"
                            onClick={() =>
                              isPackMode && updateDeductUnit(item.productId, 'stock')
                            }
                            className={`px-2 py-0.5 transition-colors ${
                              !isPackMode
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            Single
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              !isPackMode && updateDeductUnit(item.productId, 'purchase')
                            }
                            className={`px-2 py-0.5 transition-colors ${
                              isPackMode
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            Pack
                          </button>
                        </div>
                      )}
                    </div>
                    {stockEquiv !== null && (
                      <p className="text-xs text-muted-foreground/70">
                        = {stockEquiv} {item.stockUnit}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
        {deductionList.length === 0 && (
          <p className="px-4 py-4 text-center text-xs text-muted-foreground">
            Cart is empty. Set a qty and click Add.
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="border-t p-3">
        <Button
          className="w-full gap-2 text-sm"
          size="sm"
          onClick={handleDeduct}
          disabled={deductionList.length === 0 || issueMutation.isPending}
        >
          {issueMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PackageMinus className="h-3.5 w-3.5" />
          )}
          {issueMutation.isPending
            ? 'Deducting...'
            : `Deduct ${deductionList.length} Item${deductionList.length !== 1 ? 's' : ''}`}
        </Button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground uppercase tracking-wider">
          Recorded in shift ledger instantly
        </p>
      </div>
    </div>
  )
}
