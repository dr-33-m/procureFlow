import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { QtyInput } from './qty-input'
import type {IssuanceInventoryItem} from '@/stores/issuance-cart';
import type {ColumnDef} from '@/components/ui/data-table';
import {  DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {  useIssuanceCart } from '@/stores/issuance-cart'
import { formatParPerGuest, formatQuantity } from '@/lib/format'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'

const PAGE_SIZE = 10

interface IssuanceTableProps {
  inventory: Array<IssuanceInventoryItem>
}

export function IssuanceTable({ inventory }: IssuanceTableProps) {
  const { deductQtys, setDeductQty, addToCart } = useIssuanceCart()
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [inventory])

  const columns: Array<ColumnDef<IssuanceInventoryItem>> = [
    {
      key: 'item',
      header: 'Item Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.barcode ? `SKU: ${row.barcode}` : '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (row) => (
        <Badge variant="secondary" className="text-xs font-semibold uppercase">
          {row.category}
        </Badge>
      ),
    },
    {
      key: 'inStock',
      header: 'In Stock',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.quantity === 0
              ? 'text-red-600'
              : row.quantity <= LOW_STOCK_THRESHOLD
                ? 'text-amber-600'
                : 'text-green-700'
          }`}
        >
          {formatQuantity(row.quantity.toString())} {row.stockUnit}
        </span>
      ),
    },
    {
      key: 'parPerGuest',
      header: 'Par/Guest',
      hideOnMobile: true,
      render: (row) => {
        const configured = formatParPerGuest(row)
        const learned = row.learnedPerGuestStock
        // Only highlight the learned rate when it comes from real
        // consumption (reconciliation / issuance). Static-par would just
        // echo the configured value back, which is noisy.
        const hasMeaningfulLearned =
          learned !== null &&
          row.learnedSource !== null &&
          row.learnedSource !== 'static-par' &&
          row.learnedSource !== 'none'

        if (!hasMeaningfulLearned) {
          return <span className="text-sm text-muted-foreground">{configured}</span>
        }

        const confidenceTone =
          row.learnedConfidence === 'high'
            ? 'text-emerald-700'
            : row.learnedConfidence === 'medium'
              ? 'text-blue-700'
              : 'text-amber-700'

        return (
          <div className="flex flex-col leading-tight">
            <span className={`text-sm font-medium ${confidenceTone}`}>
              {formatQuantity(learned)} {row.stockUnit}
              <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                {row.learnedConfidence}
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              configured: {configured}
            </span>
          </div>
        )
      },
    },
    {
      key: 'qtyToDeduct',
      header: 'Qty to Deduct',
      render: (row) => (
        <QtyInput
          value={deductQtys[row.productId] ?? 0}
          onChange={(v) => setDeductQty(row.productId, v)}
        />
      ),
    },
    {
      key: 'action',
      header: '',
      className: 'w-28',
      render: (row) => {
        const qty = deductQtys[row.productId] ?? 0
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={qty <= 0}
            onClick={() => addToCart(row)}
          >
            Add to Cart
          </Button>
        )
      },
    },
  ]

  const totalPages = Math.max(1, Math.ceil(inventory.length / PAGE_SIZE))
  const pageItems = inventory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="mb-8 overflow-x-auto rounded-xl border bg-card shadow-sm">
      <DataTable
        data={pageItems}
        columns={columns}
        emptyMessage="No items match your search."
      />
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, inventory.length)} of{' '}
            {inventory.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
