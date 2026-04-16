import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, Plus, X, PackageMinus, TrendingUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  searchProducts,
  getRecentIssuances,
  getTodayIssuanceStats,
  issueStock,
} from '@/server/issuance'
import { formatQuantity, formatTime } from '@/lib/format'
import { STATIONS } from '@/lib/constants'
import type { IssuanceItem } from '@/types'

export const Route = createFileRoute('/issuance/')({
  loader: async () => {
    const [recentIssuances, todayStats] = await Promise.all([
      getRecentIssuances(),
      getTodayIssuanceStats(),
    ])
    return { recentIssuances, todayStats }
  },
  component: IssuancePage,
})

function IssuancePage() {
  const { recentIssuances: initialIssuances, todayStats: initialStats } =
    Route.useLoaderData()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof searchProducts>>
  >([])
  const [qty, setQty] = useState(1)
  const [deductionList, setDeductionList] = useState<IssuanceItem[]>([])
  const [isDeducting, setIsDeducting] = useState(false)
  const [recentIssuances, setRecentIssuances] = useState(initialIssuances)
  const [todayStats, setTodayStats] = useState(initialStats)

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.length >= 2) {
      const results = await searchProducts({ data: q })
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  const addToDeduction = (
    product: (typeof searchResults)[number],
  ) => {
    const existing = deductionList.find((i) => i.productId === product.id)
    if (existing) return
    setDeductionList((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        productUnit: product.unit,
        currentQty: parseFloat(product.quantity ?? '0'),
        deductQty: qty,
        station: STATIONS[0],
      },
    ])
    setSearchQuery('')
    setSearchResults([])
    setQty(1)
  }

  const removeFromDeduction = (productId: string) => {
    setDeductionList((prev) => prev.filter((i) => i.productId !== productId))
  }

  const handleDeduct = async () => {
    if (deductionList.length === 0) return
    setIsDeducting(true)
    try {
      await issueStock({
        data: deductionList.map((i) => ({
          productId: i.productId,
          deductQty: i.deductQty,
          station: i.station,
        })),
      })
      setDeductionList([])
      // Refresh data
      const [newIssuances, newStats] = await Promise.all([
        getRecentIssuances(),
        getTodayIssuanceStats(),
      ])
      setRecentIssuances(newIssuances)
      setTodayStats(newStats)
    } finally {
      setIsDeducting(false)
    }
  }

  const deltaSign = todayStats.deltaPercent >= 0 ? '+' : ''

  return (
    <AppLayout headerPlaceholder="Quick search items...">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Inventory Management
          </p>
          <h1 className="text-3xl font-bold">Stock Issuance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record stock departures from the central pantry for kitchen
            operations.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-600">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Find & Add */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Find &amp; Add Item</h2>
            </div>

            <div className="grid grid-cols-[1fr_140px_80px] gap-3">
              <div className="relative">
                <label className="mb-1 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Search SKU or Name
                </label>
                <Input
                  placeholder="e.g. Extra Virgin Olive Oil 5L"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-background shadow-lg">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addToDeduction(p)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.barcode ? `SKU: ${p.barcode}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatQuantity(p.quantity ?? '0')} {p.unit} available
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Quantity
                </label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={qty}
                  onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full gap-1"
                  onClick={() => {
                    if (searchResults[0]) addToDeduction(searchResults[0])
                  }}
                  disabled={searchResults.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Deduction List */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <PackageMinus className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Deduction List</h2>
              </div>
              {/* Default station selector */}
              <Select defaultValue={STATIONS[0]}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {deductionList.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No items added yet. Search above to add items.
              </div>
            ) : (
              <div className="divide-y">
                {deductionList.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <PackageMinus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-primary">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: —
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {item.deductQty} {item.productUnit}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        DEDUCTION
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeFromDeduction(item.productId)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {deductionList.length > 0 && (
              <div className="border-t p-4">
                <Button
                  className="w-full gap-2"
                  onClick={handleDeduct}
                  disabled={isDeducting}
                >
                  <PackageMinus className="h-4 w-4" />
                  {isDeducting
                    ? 'Processing...'
                    : `Deduct ${deductionList.length} Item${deductionList.length > 1 ? 's' : ''} from Stock`}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  ACTION WILL BE RECORDED IN SHIFT LEDGER INSTANTLY
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Today's Total */}
          <div className="rounded-xl bg-primary p-5 text-primary-foreground shadow-sm">
            <p className="mb-2 text-xs font-semibold tracking-wider uppercase opacity-70">
              Today's Total Issuance
            </p>
            <p className="text-5xl font-bold">{Math.round(todayStats.todayCount)}</p>
            <p className="mt-1 text-sm opacity-80">SKUs issued</p>
            {todayStats.yesterdayCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {deltaSign}{todayStats.deltaPercent}% vs. yesterday
                </span>
              </div>
            )}
          </div>

          {/* Recent Issuances */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-5 py-4">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Recent Issuances
              </p>
            </div>
            <div className="divide-y">
              {recentIssuances.slice(0, 5).map((issuance) => (
                <div
                  key={issuance.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                      <PackageMinus className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {issuance.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {issuance.station ?? 'Unknown'} •{' '}
                        {formatTime(issuance.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-600">
                      {parseFloat(issuance.quantity) > 0
                        ? `+${formatQuantity(issuance.quantity)}`
                        : formatQuantity(issuance.quantity)}{' '}
                      Units
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold uppercase"
                    >
                      {issuance.method}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentIssuances.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No recent issuances today.
                </div>
              )}
            </div>
            <div className="border-t px-5 py-3 text-center">
              <button
                type="button"
                className="text-sm font-semibold text-primary hover:underline"
              >
                View All Activity Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
