import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Trash2, Plus, ChevronRight } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getRunners, getProductCatalog, createShoppingList } from '@/server/shopping-lists'
import { formatCurrencyFull } from '@/lib/format'

export const Route = createFileRoute('/shopping-lists/create')({
  loader: async () => {
    const [runners, catalog] = await Promise.all([
      getRunners(),
      getProductCatalog(),
    ])
    return { runners, catalog }
  },
  component: CreateShoppingListPage,
})

interface LineItem {
  productId: string
  productName: string
  quantity: number
  unit: string
  unitPrice: number
}

function CreateShoppingListPage() {
  const { runners, catalog } = Route.useLoaderData()
  const router = useRouter()

  const [listName, setListName] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [items, setItems] = useState<LineItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const filteredCatalog = catalog.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !items.find((i) => i.productId === p.id),
  )

  const addItem = (product: (typeof catalog)[number]) => {
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: newQty,
        unit: product.unit,
        unitPrice: 0,
      },
    ])
    setSearchQuery('')
    setNewQty(1)
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const updateQty = (productId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    )
  }

  const projectedTotal = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  )

  const handleSubmit = async () => {
    if (!listName.trim()) return
    setSubmitting(true)
    try {
      await createShoppingList({
        data: {
          name: listName,
          assignedTo: assignedTo || null,
          priority,
          items: items.map((i) => ({
            productId: i.productId,
            requestedQuantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      })
      router.navigate({ to: '/shopping-lists' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout headerPlaceholder="Search orders, items, or runners...">
      <PageHeader
        title="Create Shopping List"
        description="Draft a new replenishment order and assign a runner to fulfill requirements."
        breadcrumb={[
          { label: 'Procurement', href: '/shopping-lists' },
          { label: 'Lists', href: '/shopping-lists' },
        ]}
      />

      {/* Form Card */}
      <div className="mb-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-4">
          {/* List Name */}
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

          {/* Assign to Runner */}
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

          {/* Priority Level */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Priority Level
            </label>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  priority === 'normal'
                    ? 'bg-background'
                    : 'bg-muted text-muted-foreground'
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
      </div>

      {/* Items Card */}
      <div className="mb-24 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Add Items to List</h2>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            ↺ IMPORT FROM TEMPLATE
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_120px_140px_60px] gap-4 border-b px-5 py-2.5">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Item Name
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Quantity
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Unit
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Action
          </span>
        </div>

        {/* Existing items */}
        {items.map((item) => (
          <div
            key={item.productId}
            className="grid grid-cols-[1fr_120px_140px_60px] items-center gap-4 border-b px-5 py-4"
          >
            <span className="font-medium">{item.productName}</span>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                updateQty(item.productId, parseInt(e.target.value) || 1)
              }
              className="h-9"
            />
            <span className="text-sm text-muted-foreground">{item.unit}</span>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add Item Row */}
        <div className="relative grid grid-cols-[1fr_120px_140px_60px] items-center gap-4 px-5 py-4">
          <div className="relative">
            <Input
              placeholder="Type to search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-muted-foreground"
            />
            {searchQuery.length > 0 && filteredCatalog.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-background shadow-lg">
                {filteredCatalog.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addItem(p)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            type="number"
            min={1}
            value={newQty}
            onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
            className="h-9 text-muted-foreground"
          />
          <span className="text-sm text-muted-foreground">Select unit</span>
          <button
            type="button"
            onClick={() => {
              if (searchQuery && filteredCatalog[0]) {
                addItem(filteredCatalog[0])
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-60 right-0 border-t bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Items Count
              </p>
              <p className="text-xl font-bold text-primary">
                {String(items.length).padStart(2, '0')}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  Products
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Projected Total
              </p>
              <p className="text-xl font-bold">
                {formatCurrencyFull(projectedTotal)}
              </p>
            </div>
            <p className="max-w-xs text-xs text-muted-foreground">
              Estimates based on last 3 months average supplier pricing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit()}
              disabled={submitting || !listName.trim()}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit()}
              disabled={submitting || !listName.trim() || items.length === 0}
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
