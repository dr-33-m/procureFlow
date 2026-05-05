import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle, Loader2, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import type { DetectedBarcode } from 'react-barcode-scanner'

const BarcodeScanner = lazy(() => {
  import('react-barcode-scanner/polyfill')
  return import('react-barcode-scanner').then((m) => ({ default: m.BarcodeScanner }))
})
import { cn } from '@/lib/utils'
import { formatCurrencyFull, formatQuantity } from '@/lib/format'
import { AppLayout } from '@/components/layout/app-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { StatusBadge } from '@/components/ui/status-badge'
import { useShoppingList, useUpdateShoppingListItem, useUpdateShoppingListStatus } from '@/hooks/use-shopping-lists'
import { RunnerItemSheet } from './runner-item-sheet'
import type { ShoppingListDetailItem } from '@/types'

type Filter = 'all' | 'pending' | 'done'

interface RunnerPageProps {
  listId: string
}

export function RunnerPage({ listId }: RunnerPageProps) {
  const navigate = useNavigate()
  const { data: list } = useShoppingList(listId)
  const statusMutation = useUpdateShoppingListStatus()
  const quickUpdateMutation = useUpdateShoppingListItem(listId)

  const [filter, setFilter] = useState<Filter>('all')
  const [selectedItem, setSelectedItem] = useState<ShoppingListDetailItem | null>(null)
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [scannerSheetOpen, setScannerSheetOpen] = useState(false)

  const handledItems = useMemo(
    () => (list?.items ?? []).filter((i) => i.status !== 'pending'),
    [list?.items],
  )
  const progressPct = useMemo(
    () =>
      list?.items.length
        ? Math.round((handledItems.length / list.items.length) * 100)
        : 0,
    [handledItems.length, list?.items.length],
  )
  const allDone = useMemo(
    () => (list?.items ?? []).every((i) => i.status !== 'pending'),
    [list?.items],
  )
  const actualSpend = useMemo(
    () =>
      (list?.items ?? []).reduce(
        (sum, i) =>
          sum + parseFloat(i.purchasedQuantity ?? '0') * parseFloat(i.pricePerStockUnit ?? '0'),
        0,
      ),
    [list?.items],
  )
  const filteredItems = useMemo(() => {
    const items = list?.items ?? []
    if (filter === 'pending') return items.filter((i) => i.status === 'pending')
    if (filter === 'done') return items.filter((i) => i.status !== 'pending')
    return items
  }, [list?.items, filter])

  const filterCounts = useMemo(() => {
    const items = list?.items ?? []
    return {
      all: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      done: items.filter((i) => i.status !== 'pending').length,
    }
  }, [list?.items])

  if (!list) return null

  const handleQuickStatus = (item: ShoppingListDetailItem, status: 'found' | 'partial' | 'not_found') => {
    if (status === 'partial') {
      setSelectedItem(item)
      setItemSheetOpen(true)
      return
    }
    quickUpdateMutation.mutate({
      id: item.id,
      status,
      purchasedQuantity: status === 'found' ? parseFloat(item.requestedQuantity ?? '0') : 0,
      pricePerStockUnit: parseFloat(item.pricePerStockUnit ?? '0'),
    })
  }

  const handleBarcodeScan = (barcodes: DetectedBarcode[]) => {
    const rawValue = barcodes[0]?.rawValue
    if (!rawValue) return
    const found = list.items.find((i) => i.productBarcode === rawValue)
    if (found) {
      setScannerSheetOpen(false)
      setSelectedItem(found)
      setItemSheetOpen(true)
    } else {
      toast.error('Product not found in this list')
    }
  }

  const handleCompleteShoppingClick = () => {
    statusMutation.mutate(
      { id: listId, status: 'in_review' },
      { onSuccess: () => navigate({ to: '/shopping-lists/$id', params: { id: listId } }) },
    )
  }

  // Start shopping gate
  if (list.status !== 'shopping') {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
            <h1 className="text-xl font-bold">{list.name}</h1>
            <StatusBadge status={list.status} />
            <p className="text-sm text-muted-foreground">
              {list.status === 'pending'
                ? 'Ready to start shopping. Tap below when you arrive at the market.'
                : list.status === 'in_review' || list.status === 'completed'
                  ? 'This shopping run has already been completed.'
                  : 'This list is not currently active.'}
            </p>
            {list.status === 'pending' && (
              <Button
                className="w-full"
                onClick={() => statusMutation.mutate({ id: listId, status: 'shopping' })}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Shopping
              </Button>
            )}
            <Link to="/shopping-lists/$id" params={{ id: listId }}>
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Top nav */}
      <div className="mb-4 flex items-center gap-2">
        <Link to="/shopping-lists/$id" params={{ id: listId }}>
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="flex-1 truncate text-center font-semibold">{list.name}</h1>
        <StatusBadge status={list.status} />
      </div>

      {/* Progress card */}
      <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            {handledItems.length} / {list.items.length} items handled
          </span>
          <span className="text-muted-foreground">{formatCurrencyFull(actualSpend)} spent</span>
        </div>
        <Progress value={progressPct} className="h-2.5" />
      </div>

      {/* Action bar */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="outline"
          className="shrink-0 gap-2"
          onClick={() => setScannerSheetOpen(true)}
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline">Scan Barcode</span>
          <span className="sm:hidden">Scan</span>
        </Button>

        <div className="flex flex-1 gap-1 rounded-lg bg-muted p-1">
          {(['all', 'pending', 'done'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                filter === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'all'
                ? `All (${filterCounts.all})`
                : f === 'pending'
                  ? `Pending (${filterCounts.pending})`
                  : `Done (${filterCounts.done})`}
            </button>
          ))}
        </div>
      </div>

      {/* Item cards */}
      <div className="mb-28 space-y-3">
        {filteredItems.length === 0 ? (
          <EmptyState
            title="No items"
            description={
              filter === 'pending'
                ? 'All items have been handled.'
                : filter === 'done'
                  ? 'No items have been handled yet.'
                  : 'This list has no items.'
            }
          />
        ) : (
          filteredItems.map((item) => <ItemCard key={item.id} item={item} onQuickStatus={handleQuickStatus} onEdit={(i) => { setSelectedItem(i); setItemSheetOpen(true) }} quickUpdatePending={quickUpdateMutation.isPending && quickUpdateMutation.variables?.id === item.id} />)
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-4 md:left-(--sidebar-width,16rem)">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actual Spend
            </p>
            <p className="text-xl font-bold">{formatCurrencyFull(actualSpend)}</p>
          </div>
          <Button
            onClick={handleCompleteShoppingClick}
            disabled={!allDone || statusMutation.isPending}
            className="gap-2"
          >
            {statusMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Complete Shopping
          </Button>
        </div>
      </div>

      {/* Item sheet */}
      {selectedItem && (
        <RunnerItemSheet
          item={selectedItem}
          listId={listId}
          open={itemSheetOpen}
          onOpenChange={(open) => {
            setItemSheetOpen(open)
            if (!open) setSelectedItem(null)
          }}
        />
      )}

      {/* Barcode scanner sheet */}
      <Sheet open={scannerSheetOpen} onOpenChange={setScannerSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0">
          <SheetHeader className="px-5 py-4">
            <SheetTitle>Scan Barcode</SheetTitle>
            <SheetDescription>Point your camera at a product barcode</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-5 pb-5">
            <div className="h-full overflow-hidden rounded-xl bg-black">
              {scannerSheetOpen && (
                <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                  <BarcodeScanner
                    onCapture={handleBarcodeScan}
                    options={{
                      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
                      delay: 500,
                    }}
                    className="h-full w-full object-cover"
                  />
                </Suspense>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  )
}

interface ItemCardProps {
  item: ShoppingListDetailItem
  onQuickStatus: (item: ShoppingListDetailItem, status: 'found' | 'partial' | 'not_found') => void
  onEdit: (item: ShoppingListDetailItem) => void
  quickUpdatePending: boolean
}

function ItemCard({ item, onQuickStatus, onEdit, quickUpdatePending }: ItemCardProps) {
  const isPending = item.status === 'pending'

  const supplierName = item.suppliers.length > 0 && item.pricePerStockUnit && parseFloat(item.pricePerStockUnit) > 0
    ? item.suppliers.find(() => true)?.name
    : null

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.productName}</p>
          <p className="text-sm text-muted-foreground">
            Needed: {formatQuantity(item.requestedQuantity)} {item.stockUnit}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            {item.productCategory}
          </Badge>
          <StatusBadge status={item.status} />
        </div>
      </div>

      {isPending ? (
        <div className="flex gap-2">
          {[
            { status: 'found', label: 'Found', active: 'border-green-300 bg-green-50 text-green-700', idle: 'border-border bg-muted text-muted-foreground hover:bg-green-50 hover:text-green-700 hover:border-green-300' },
            { status: 'partial', label: 'Partial', active: 'border-amber-300 bg-amber-50 text-amber-700', idle: 'border-border bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300' },
            { status: 'not_found', label: 'Not Found', active: 'border-red-300 bg-red-50 text-red-700', idle: 'border-border bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-700 hover:border-red-300' },
          ].map(({ status, label, idle }) => (
            <button
              key={status}
              type="button"
              disabled={quickUpdatePending}
              onClick={() => onQuickStatus(item, status as 'found' | 'partial' | 'not_found')}
              className={cn(
                'flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors sm:text-sm',
                idle,
                quickUpdatePending && 'cursor-not-allowed opacity-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {item.status === 'not_found'
              ? 'Not purchased'
              : [
                  `Got ${formatQuantity(item.purchasedQuantity ?? '0')} ${item.stockUnit}`,
                  supplierName ? `via ${supplierName}` : null,
                  item.pricePerStockUnit && parseFloat(item.pricePerStockUnit) > 0
                    ? `@ ${formatCurrencyFull(item.pricePerStockUnit)}/${item.stockUnit}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
          </p>
          <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
            Edit
          </Button>
        </div>
      )}
    </div>
  )
}
