import { PackagePlus, Loader2, CheckCircle2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyFull } from '@/lib/format'
import type { ColumnDef } from '@/components/ui/data-table'
import type { ReceivingListDetail } from '@/types'

export type ReceivingItemRow = ReceivingListDetail['items'][number]

type ReceivingColumnsOpts = {
  quantities: Record<string, number>
  listCompleted: boolean
  getItemStatus: (item: ReceivingItemRow) => 'pending' | 'matched' | 'shortage' | 'surplus'
  handleQuantityChange: (id: string, v: number) => void
  handleApproveItem: (item: ReceivingItemRow) => void
  handleConfirmItem: (id: string) => void
  approveItemMutation: { isPending: boolean; variables?: string }
  approvedItemIds: Set<string>
  confirmedItemIds: Set<string>
}

export function buildReceivingColumns(opts: ReceivingColumnsOpts): ColumnDef<ReceivingItemRow>[] {
  const {
    quantities,
    listCompleted,
    getItemStatus,
    handleQuantityChange,
    handleApproveItem,
    handleConfirmItem,
    approveItemMutation,
    approvedItemIds,
    confirmedItemIds,
  } = opts

  return [
    {
      key: 'sku',
      header: 'SKU / Item Description',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
            ≡
          </div>
          <div>
            <p className="font-mono text-sm font-semibold">
              {item.productBarcode ?? (item.productId ?? '').slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground">{item.productName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (item) => (
        <Badge variant="secondary" className="text-xs font-semibold uppercase">
          {item.productCategory}
        </Badge>
      ),
    },
    {
      key: 'expected',
      header: 'Expected',
      render: (item) => (
        <span className="font-semibold">
          {item.requestedQuantity ?? '0'} {item.stockUnit}
        </span>
      ),
    },
    {
      key: 'purchased',
      header: 'Bought (Runner)',
      render: (item) => {
        const bought = parseFloat(item.purchasedQuantity ?? '0')
        const expected = parseFloat(item.requestedQuantity ?? '0')
        const isShort = bought < expected
        const isOver = bought > expected
        return (
          <span className={`font-semibold ${isShort ? 'text-amber-600' : isOver ? 'text-blue-600' : ''}`}>
            {item.purchasedQuantity ?? '0'} {item.stockUnit}
          </span>
        )
      },
    },
    {
      key: 'received',
      header: 'Received (Count)',
      render: (item) => {
        const maxReceivable = parseFloat(item.purchasedQuantity ?? '0')
        return (
          <QuantityStepper
            value={quantities[item.id] ?? 0}
            onChange={(v) => handleQuantityChange(item.id, v)}
            min={0}
            max={maxReceivable}
            disabled={listCompleted || maxReceivable === 0}
          />
        )
      },
    },
    {
      key: 'pricePerStockUnit',
      header: 'Price / Unit',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.pricePerStockUnit ? formatCurrencyFull(parseFloat(item.pricePerStockUnit)) : '—'}
        </span>
      ),
    },
    {
      key: 'lineTotal',
      header: 'Line Total',
      hideOnMobile: true,
      render: (item) => {
        const received = quantities[item.id] ?? 0
        const price = parseFloat(item.pricePerStockUnit ?? '0')
        return (
          <span className="text-sm font-medium">
            {price > 0 ? formatCurrencyFull(received * price) : '—'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const status = getItemStatus(item)
        const received = quantities[item.id] ?? 0
        const expected = parseFloat(item.requestedQuantity ?? '0')
        const diff = received - expected
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {status === 'shortage' && diff !== 0 && (
              <span className="text-xs text-red-600">{diff}</span>
            )}
            {status === 'surplus' && (
              <span className="text-xs text-blue-600">+{diff}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: (item) => {
        const alreadyAdded = approvedItemIds.has(item.id)
        const alreadyConfirmed = confirmedItemIds.has(item.id)
        const isLoading =
          approveItemMutation.isPending && approveItemMutation.variables === item.id
        const receivedQty = quantities[item.id] ?? 0

        if (!alreadyConfirmed) {
          return (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={listCompleted}
              onClick={() => handleConfirmItem(item.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Count
            </Button>
          )
        }

        return (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={alreadyAdded || listCompleted || isLoading || receivedQty === 0}
            onClick={() => handleApproveItem(item)}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PackagePlus className="h-3.5 w-3.5" />
            )}
            {alreadyAdded ? 'Added' : 'Add to Pantry'}
          </Button>
        )
      },
    },
  ]
}
