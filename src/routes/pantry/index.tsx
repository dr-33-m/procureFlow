import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Download, Plus, MoreVertical, Package } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { getPantryStats, getInventoryItems, getCategories, addInventoryItem } from '@/server/pantry'
import { getProductCatalog } from '@/server/shopping-lists'
import { formatCurrency, formatQuantity } from '@/lib/format'
import { LOW_STOCK_THRESHOLD } from '@/lib/constants'
import type { InventoryWithProduct } from '@/types'

const PAGE_SIZE = 10

export const Route = createFileRoute('/pantry/')({
  loader: async () => {
    const [stats, data, categories, catalog] = await Promise.all([
      getPantryStats(),
      getInventoryItems({ data: { page: 1, pageSize: PAGE_SIZE, category: 'all', sortBy: 'name' } }),
      getCategories(),
      getProductCatalog(),
    ])
    return { stats, data, categories, catalog }
  },
  component: PantryPage,
})

function getStockStatus(qty: string | null) {
  const q = parseFloat(qty ?? '0')
  if (q === 0) return 'out_of_stock'
  if (q <= LOW_STOCK_THRESHOLD) return 'low_stock'
  return 'in_stock'
}

function PantryPage() {
  const { stats, data: initialData, categories, catalog } = Route.useLoaderData()

  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [items, setItems] = useState(initialData.items)
  const [total, setTotal] = useState(initialData.total)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addQty, setAddQty] = useState(0)
  const [adding, setAdding] = useState(false)

  const loadPage = async (newPage: number, cat = category, sort = sortBy) => {
    const result = await getInventoryItems({
      data: { page: newPage, pageSize: PAGE_SIZE, category: cat, sortBy: sort },
    })
    setItems(result.items)
    setTotal(result.total)
    setPage(newPage)
  }

  const handleCategoryChange = async (val: string) => {
    setCategory(val)
    await loadPage(1, val, sortBy)
  }

  const handleSortChange = async (val: string) => {
    setSortBy(val)
    await loadPage(1, category, val)
  }

  const handleAdd = async () => {
    if (!selectedProductId || addQty <= 0) return
    setAdding(true)
    try {
      await addInventoryItem({ data: { productId: selectedProductId, quantity: addQty } })
      setAddDialogOpen(false)
      await loadPage(page)
    } finally {
      setAdding(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

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
            <p className="text-xs text-muted-foreground">
              SKU: {row.productSku ?? '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Current Quantity',
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
          {formatQuantity(row.quantity ?? '0')}
        </span>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (row) => (
        <Badge variant="secondary" className="uppercase text-xs font-semibold">
          {row.productUnit}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={getStockStatus(row.quantity)} />,
    },
    {
      key: 'updated',
      header: 'Last Updated',
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
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <AppLayout headerPlaceholder="Search pantry items...">
      <PageHeader
        title="Pantry Inventory"
        description="Current stock levels for essential supplies and raw materials."
        actions={
          <>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </>
        }
      />

      {/* Stat Cards */}
      <div className="mb-5 grid grid-cols-4 gap-4">
        <StatCard
          label="Total SKUs"
          value={stats.totalSkus.toLocaleString()}
          subValue="+12 from last month"
          subValueVariant="positive"
          accentBorder
          variant="default"
        />
        <StatCard
          label="Low Stock Items"
          value={stats.lowStockCount}
          subValue="Requires immediate attention"
          subValueVariant="warning"
          accentBorder
          variant="warning"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStockCount}
          subValue="Critical Impact"
          subValueVariant="danger"
          accentBorder
          variant="danger"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(stats.inventoryValue)}
          subValue="Adjusted for FIFO"
          accentBorder
          variant="default"
          className="border-l-indigo-400"
        />
      </div>

      {/* Filter Row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort by Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="quantity">Sort by Quantity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-sm text-muted-foreground">
          Showing <strong>{start} - {end}</strong> of {total} items
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <DataTable data={items} columns={columns} />
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => loadPage(page - 1)}
          disabled={page === 1}
          className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          Previous
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = i + 1
            return (
              <button
                key={p}
                type="button"
                onClick={() => loadPage(p)}
                className={`h-8 w-8 rounded-lg text-sm font-medium ${
                  page === p
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {p}
              </button>
            )
          })}
          {totalPages > 5 && (
            <>
              <span className="px-1 text-muted-foreground">…</span>
              <button
                type="button"
                onClick={() => loadPage(totalPages)}
                className="h-8 w-8 rounded-lg text-sm font-medium hover:bg-muted"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadPage(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Product</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Initial Quantity
              </label>
              <Input
                type="number"
                min={0}
                value={addQty}
                onChange={(e) => setAddQty(parseFloat(e.target.value) || 0)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={adding || !selectedProductId || addQty <= 0}
            >
              {adding ? 'Adding...' : 'Add to Inventory'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
