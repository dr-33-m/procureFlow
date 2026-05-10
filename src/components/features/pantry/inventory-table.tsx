import { useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Package, MoreHorizontal, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useInventoryItems, useDeleteInventoryItem } from '@/hooks/use-pantry'
import { formatQuantity } from '@/lib/format'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import { formatPriceLabel } from '@/server/lib/pricing'
import type { InventoryWithProduct } from '@/types'

const PAGE_SIZE = 10
const routeApi = getRouteApi('/pantry/')

function getStockStatus(qty: string | null) {
  const q = parseFloat(qty ?? '0')
  if (q === 0) return 'out_of_stock'
  if (q <= LOW_STOCK_THRESHOLD) return 'low_stock'
  return 'in_stock'
}

interface InventoryTableProps {
  onEdit?: (item: InventoryWithProduct) => void
}

export function InventoryTable({ onEdit }: InventoryTableProps) {
  const { page, category, sortBy, q } = routeApi.useSearch()
  const navigate = useNavigate({ from: '/pantry/' })
  const deleteMutation = useDeleteInventoryItem()
  const [pendingDelete, setPendingDelete] = useState<InventoryWithProduct | null>(null)

  const params = {
    page: page ?? 1,
    pageSize: PAGE_SIZE,
    category: category ?? 'all',
    sortBy: sortBy ?? 'name',
    q: q ?? '',
  }

  const { data } = useInventoryItems(params)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const currentPage = page ?? 1
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const start = (currentPage - 1) * PAGE_SIZE + 1
  const end = Math.min(currentPage * PAGE_SIZE, total)

  const goToPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }) })

  const columns: ColumnDef<InventoryWithProduct>[] = [
    {
      key: 'item',
      header: 'Item Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-primary">{row.productName}</p>
            <p className="text-xs text-muted-foreground">SKU: {row.productSku ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'In Stock',
      render: (row) => (
        <span
          className={`text-lg font-bold ${
            parseFloat(row.quantity ?? '0') === 0
              ? 'text-red-600'
              : parseFloat(row.quantity ?? '0') <= LOW_STOCK_THRESHOLD
                ? 'text-amber-600'
                : ''
          }`}
        >
          {formatQuantity(row.quantity ?? '0')} {row.stockUnit}
        </span>
      ),
    },
    {
      key: 'pricing',
      header: 'Pricing',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatPriceLabel(row)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={getStockStatus(row.quantity)} />,
    },
    {
      key: 'suppliers',
      header: 'Suppliers',
      hideOnMobile: true,
      render: (row) => {
        const sups = row.suppliers ?? []
        if (sups.length === 0) return <span className="text-sm text-muted-foreground">—</span>
        return (
          <div className="space-y-0.5">
            {sups.map((s) => (
              <div key={s.id} className="text-sm">
                <span className="font-medium">{s.name}</span>
                {s.pricePerUnit && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ${parseFloat(s.pricePerUnit).toFixed(2)}/{row.stockUnit}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      },
    },
    {
      key: 'updated',
      header: 'Last Updated',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.updatedAt
            ? new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(row.updatedAt))
            : '—'}
        </span>
      ),
    },
  ]

  if (onEdit) {
    const editCol: ColumnDef<InventoryWithProduct> = {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2" onClick={() => onEdit(row)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="gap-2"
              onClick={(e) => { e.stopPropagation(); setPendingDelete(row) }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }
    columns.push(editCol)
  }

  return (
    <>
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable data={items} columns={columns} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {start}–{end} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>

    <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete item?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{pendingDelete?.productName}</span> will be removed from inventory. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (pendingDelete) {
                deleteMutation.mutate(pendingDelete.id, {
                  onSuccess: () => setPendingDelete(null),
                })
              }
            }}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
