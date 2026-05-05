import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Trash2, Plus, ChevronRight, Users, Sparkles, Loader2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
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
  useProductsWithStock,
  useRunners,
  useCreateShoppingList,
  useRestockSuggestions,
} from '@/hooks/use-shopping-lists'
import { formatCurrencyFull, formatQuantity } from '@/lib/format'
import { pricePerStockUnit } from '@/server/lib/pricing'
import type { ProductWithStock, RestockSuggestion } from '@/types'

// Days per period type (used for math and lookback selection)
const PERIOD_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

interface LineItem {
  productId: string
  productName: string
  quantity: number
  quantityUnit: 'stock' | 'purchase'
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  pricePerStockUnit: number
  currentStock: number
  // suggestion metadata — present when added via server suggestion
  urgency?: 'critical' | 'soon' | 'ok'
  source?: 'history' | 'par' | 'unknown'
  sampleSize?: number
  onHand?: number
}

const URGENCY_CONFIG = {
  critical: { label: 'Critical', icon: AlertTriangle, className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  soon: { label: 'Soon', icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  ok: { label: 'OK', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
}

const URGENCY_ORDER: Record<string, number> = { critical: 0, soon: 1, ok: 2 }

function sortByUrgency(items: LineItem[]): LineItem[] {
  return [...items].sort((a, b) => {
    const ua = URGENCY_ORDER[a.urgency ?? 'ok'] ?? 2
    const ub = URGENCY_ORDER[b.urgency ?? 'ok'] ?? 2
    return ua - ub
  })
}

export function CreateListPage() {
  const navigate = useNavigate()
  const { data: runners = [] } = useRunners()
  const { data: catalogWithStock = [] } = useProductsWithStock()
  const createMutation = useCreateShoppingList()
  const suggestMutation = useRestockSuggestions()

  const [listName, setListName] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')

  // Period inputs
  const [periodType, setPeriodType] = useState<'weekly' | 'biweekly' | 'monthly' | 'event'>('weekly')
  const [customPeriodDays, setCustomPeriodDays] = useState<number | ''>(7)
  const [avgDailyGuests, setAvgDailyGuests] = useState<number | ''>('')
  const [mealsPerDay, setMealsPerDay] = useState<number>(1)

  const [items, setItems] = useState<LineItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const periodDays = periodType === 'event' ? (Number(customPeriodDays) || 7) : PERIOD_DAYS[periodType]
  const expectedGuestCount =
    avgDailyGuests ? Number(avgDailyGuests) * periodDays * mealsPerDay : null

  const filteredCatalog = catalogWithStock.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !items.find((i) => i.productId === p.id),
  )

  const addItem = (product: ProductWithStock) => {
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        quantityUnit: product.purchaseUnit ? 'purchase' : 'stock',
        stockUnit: product.stockUnit,
        purchaseUnit: product.purchaseUnit ?? null,
        purchasePackSize: product.purchasePackSize ?? null,
        pricePerStockUnit: pricePerStockUnit(product),
        currentStock: product.currentStock,
      },
    ])
    setSearchQuery('')
  }

  const handleSuggest = () => {
    if (!expectedGuestCount) return
    suggestMutation.mutate(
      { expectedGuestCount, periodDays, periodType },
      {
        onSuccess: (suggestions: RestockSuggestion[]) => {
          const alreadyAdded = new Set(items.map((i) => i.productId))
          const newItems: LineItem[] = suggestions
            .filter((s) => !alreadyAdded.has(s.productId) && s.suggestedQty > 0)
            .map((s) => ({
              productId: s.productId,
              productName: s.productName,
              quantity: s.purchaseUnit
                ? Math.ceil(s.suggestedQty / (parseFloat(s.purchasePackSize ?? '1') || 1))
                : s.suggestedQty,
              quantityUnit: s.purchaseUnit ? 'purchase' : 'stock',
              stockUnit: s.stockUnit,
              purchaseUnit: s.purchaseUnit ?? null,
              purchasePackSize: s.purchasePackSize ?? null,
              pricePerStockUnit: s.pricePerStockUnit ?? 0,
              currentStock: s.onHand,
              urgency: s.urgency,
              source: s.source,
              sampleSize: s.sampleSize,
              onHand: s.onHand,
            }))
          setItems((prev) => sortByUrgency([...prev, ...newItems]))
        },
      },
    )
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const updateQty = (productId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    )
  }

  const updateQuantityUnit = (productId: string, unit: 'stock' | 'purchase') => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantityUnit: unit } : i)),
    )
  }

  const updatePrice = (productId: string, price: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, pricePerStockUnit: price } : i)),
    )
  }

  const projectedTotal = items.reduce((sum, i) => {
    const packSize = parseFloat(i.purchasePackSize ?? '1') || 1
    const stockQty = i.quantityUnit === 'purchase' ? i.quantity * packSize : i.quantity
    return sum + stockQty * i.pricePerStockUnit
  }, 0)

  const buildPayload = (status: 'draft' | 'pending') => ({
    name: listName,
    assignedTo: assignedTo || null,
    priority,
    status,
    guestCount: expectedGuestCount ?? undefined,
    periodType,
    expectedGuestCount: expectedGuestCount ?? undefined,
    expectedDailyOccupancy: avgDailyGuests ? Number(avgDailyGuests) : undefined,
    periodDays,
    mealsPerDayCount: mealsPerDay,
    items: items.map((i) => ({
      productId: i.productId,
      requestedQuantity: i.quantity,
      requestedUnit: i.quantityUnit,
      pricePerStockUnit: i.pricePerStockUnit,
    })),
  })

  const handleSaveDraft = () => {
    if (!listName.trim()) return
    createMutation.mutate(buildPayload('draft'), {
      onSuccess: () => navigate({ to: '/shopping-lists', search: { filter: undefined } }),
    })
  }

  const handleSubmit = () => {
    if (!listName.trim()) return
    createMutation.mutate(buildPayload('pending'), {
      onSuccess: () => navigate({ to: '/shopping-lists', search: { filter: undefined } }),
    })
  }

  const canSuggest = Boolean(expectedGuestCount) && catalogWithStock.length > 0

  return (
    <AppLayout>
      <PageHeader
        title="Create Shopping List"
        description="Draft a new replenishment order and assign a runner to fulfill requirements."
        breadcrumb={[
          { label: 'Procurement', href: '/shopping-lists' },
          { label: 'Lists', href: '/shopping-lists' },
        ]}
      />

      {/* Form Card */}
      <div className="mb-4 rounded-xl border bg-card p-5 shadow-sm space-y-4">
        {/* Row 1: list name, runner, priority */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              List Name
            </label>
            <Input
              placeholder="e.g. Weekly Produce Refill"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Assign to Runner
            </label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select Runner" />
              </SelectTrigger>
              <SelectContent>
                {runners.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Priority Level
            </label>
            <div className="flex overflow-hidden rounded-lg border">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  priority === 'normal' ? 'bg-background' : 'bg-muted text-muted-foreground'
                }`}
              >
                NORMAL
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  priority === 'urgent'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                URGENT
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: period / forecast inputs */}
        <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-3">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Forecast Period
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Period</label>
              <Select
                value={periodType}
                onValueChange={(v) => setPeriodType(v as typeof periodType)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly (7d)</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly (14d)</SelectItem>
                  <SelectItem value="monthly">Monthly (30d)</SelectItem>
                  <SelectItem value="event">Custom / Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'event' && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Days</label>
                <Input
                  type="number"
                  min={1}
                  value={customPeriodDays}
                  onChange={(e) => setCustomPeriodDays(e.target.value ? parseInt(e.target.value) : '')}
                  className="h-9"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Avg daily guests</label>
              <div className="relative">
                <Users className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 50"
                  value={avgDailyGuests}
                  onChange={(e) => setAvgDailyGuests(e.target.value ? parseInt(e.target.value) : '')}
                  className="h-9 pl-8"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Meals / day</label>
              <Select
                value={String(mealsPerDay)}
                onValueChange={(v) => setMealsPerDay(parseInt(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (breakfast only)</SelectItem>
                  <SelectItem value="2">2 (B + L or D)</SelectItem>
                  <SelectItem value="3">3 (B + L + D)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end">
              {expectedGuestCount ? (
                <p className="text-sm font-semibold text-foreground">
                  {expectedGuestCount.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-muted-foreground">guest-meals</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Enter daily guests to compute</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1 border-t">
            <p className="text-xs text-muted-foreground">
              {canSuggest
                ? `Suggest items using consumption history and par levels for ${periodDays} days / ${expectedGuestCount?.toLocaleString()} guest-meals`
                : 'Fill in the forecast period above to generate suggestions'}
            </p>
            <Button
              className="shrink-0 gap-2"
              onClick={handleSuggest}
              disabled={!canSuggest || suggestMutation.isPending}
            >
              {suggestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {suggestMutation.isPending ? 'Generating…' : 'Suggest Items'}
            </Button>
          </div>
        </div>
      </div>

      {/* Items Card */}
      <div className="mb-24 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Items</h2>
            {items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {items.length} product{items.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden grid-cols-[1fr_80px_160px_110px_60px_36px] gap-3 border-b px-5 py-2.5 md:grid">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Item</span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">On Hand</span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Qty &amp; Unit</span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Price / Unit</span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Source</span>
          <span />
        </div>

        {items.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">No items yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click Suggest Items above, or search and add items manually below.
            </p>
          </div>
        )}

        {items.map((item) => {
          const urgency = item.urgency
          const UrgencyIcon = urgency ? URGENCY_CONFIG[urgency].icon : null
          const urgencyCls = urgency ? URGENCY_CONFIG[urgency].className : ''

          return (
            <div
              key={item.productId}
              className="flex flex-col gap-3 border-b px-5 py-4 md:grid md:grid-cols-[1fr_80px_160px_110px_60px_36px] md:items-start md:gap-3"
            >
              {/* Name + urgency chip */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-medium leading-tight">{item.productName}</p>
                  {urgency && UrgencyIcon && (
                    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${urgencyCls}`}>
                      <UrgencyIcon className="h-2.5 w-2.5" />
                      {URGENCY_CONFIG[urgency].label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground md:hidden">
                  On hand: {formatQuantity(item.currentStock.toString())} {item.stockUnit}
                </p>
              </div>

              {/* On hand */}
              <span className="hidden text-sm text-muted-foreground md:block">
                {formatQuantity(item.currentStock.toString())}
              </span>

              {/* Qty + unit toggle */}
              <div className="flex flex-col gap-0.5">
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => updateQty(item.productId, parseInt(e.target.value) || 0)}
                    className="h-9 w-20"
                  />
                  {item.purchaseUnit ? (
                    <Select
                      value={item.quantityUnit}
                      onValueChange={(v) => updateQuantityUnit(item.productId, v as 'stock' | 'purchase')}
                    >
                      <SelectTrigger className="h-9 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">{item.purchaseUnit}</SelectItem>
                        <SelectItem value="stock">{item.stockUnit}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="h-9 w-fit items-center uppercase">
                      {item.stockUnit}
                    </Badge>
                  )}
                </div>
                {item.purchaseUnit && item.purchasePackSize && item.quantity > 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    {item.quantityUnit === 'purchase'
                      ? `= ${item.quantity * (parseFloat(item.purchasePackSize) || 1)} ${item.stockUnit}`
                      : `= ${Math.ceil(item.quantity / (parseFloat(item.purchasePackSize) || 1))} ${item.purchaseUnit}`
                    }
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="relative w-28 md:w-auto">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.pricePerStockUnit === 0 ? '' : item.pricePerStockUnit}
                  placeholder="0.00"
                  onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                  className="h-9 pl-6"
                />
              </div>

              {/* Source badge */}
              <div className="flex items-center">
                {item.source === 'history' ? (
                  <span
                    title={`Based on ${item.sampleSize} issuance events`}
                    className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                  >
                    hist ({item.sampleSize})
                  </span>
                ) : item.source === 'par' ? (
                  <span className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                    par
                  </span>
                ) : null}
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="w-fit text-muted-foreground transition-colors hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}

        {/* Search / Add Item */}
        <div className="relative flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Search catalog to add items manually…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery.length > 0 && filteredCatalog.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-background shadow-lg">
                {filteredCatalog.slice(0, 8).map((p) => {
                  const unitPrice = pricePerStockUnit(p)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted"
                    >
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {formatQuantity(p.currentStock.toString())} {p.stockUnit}
                          {unitPrice > 0 ? ` · $${unitPrice.toFixed(2)}/${p.stockUnit}` : ''}
                        </p>
                      </div>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">{p.stockUnit}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => { if (searchQuery && filteredCatalog[0]) addItem(filteredCatalog[0]) }}
            disabled={!searchQuery || filteredCatalog.length === 0}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-4 md:left-(--sidebar-width,16rem)">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Items</p>
              <p className="text-xl font-bold text-primary">
                {String(items.length).padStart(2, '0')}{' '}
                <span className="text-sm font-normal text-muted-foreground">Products</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Projected Total</p>
              <p className="text-xl font-bold">{formatCurrencyFull(projectedTotal)}</p>
            </div>
            {expectedGuestCount && (
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Guest-Meals</p>
                <p className="text-xl font-bold">{expectedGuestCount.toLocaleString()}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={createMutation.isPending || !listName.trim()}
            >
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !listName.trim() || items.length === 0}
              className="gap-2"
            >
              Create &amp; Send List
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
