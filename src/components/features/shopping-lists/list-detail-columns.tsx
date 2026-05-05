import { Package } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ColumnDef } from '@/components/ui/data-table'
import { formatCurrencyFull, formatQuantity } from '@/lib/format'
import type { ShoppingListDetail } from '@/types'

export type ListDetailItem = ShoppingListDetail['items'][number]

export const listDetailColumns: ColumnDef<ListDetailItem>[] = [
  {
    key: 'product',
    header: 'Product',
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">{row.productName}</p>
          <p className="text-xs text-muted-foreground uppercase">{row.productCategory}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'requested',
    header: 'Qty Requested',
    render: (row) => (
      <span className="font-semibold">
        {formatQuantity(row.requestedQuantity)} {row.stockUnit}
      </span>
    ),
  },
  {
    key: 'purchased',
    header: 'Qty Purchased',
    render: (row) => (
      <span className="text-muted-foreground">
        {formatQuantity(row.purchasedQuantity ?? '0')} {row.stockUnit}
      </span>
    ),
  },
  {
    key: 'pricePerStockUnit',
    header: 'Unit Price',
    render: (row) => <span>{formatCurrencyFull(row.pricePerStockUnit ?? '0')}</span>,
  },
  {
    key: 'total',
    header: 'Total',
    render: (row) => {
      const total =
        parseFloat(row.requestedQuantity ?? '0') * parseFloat(row.pricePerStockUnit ?? '0')
      return <span className="font-semibold">{formatCurrencyFull(total.toString())}</span>
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
]
