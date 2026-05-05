import { useState, useEffect } from 'react'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QtyInput } from './qty-input'
import { useIssuanceCart, type IssuanceInventoryItem } from '@/stores/issuance-cart'
import { formatQuantity } from '@/lib/format'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'

const PAGE_SIZE = 10

interface IssuanceTableProps {
  inventory: IssuanceInventoryItem[]
}

export function IssuanceTable({ inventory }: IssuanceTableProps) {
  const { deductQtys, setDeductQty, addToCart } = useIssuanceCart()
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [inventory])

  const columns: ColumnDef<IssuanceInventoryItem>[] = [
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
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.parPerGuest ? `${row.parPerGuest} ${row.stockUnit}` : '—'}
        </span>
      ),
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
