import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Filter, ArrowUpDown, CheckCircle, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getReceivingBatches, getBatch, upsertBatchItem, approveBatch } from '@/server/receiving'
import { formatTime } from '@/lib/format'
import type { BatchWithItems } from '@/types'

export const Route = createFileRoute('/receiving/')({
  loader: async () => {
    const batches = await getReceivingBatches()
    // Load the first unverified batch by default
    const firstBatch = batches.find((b) => b.status === 'unverified') ?? batches[0]
    if (!firstBatch) return { batches, batch: null }
    const batch = await getBatch({ data: firstBatch.id })
    return { batches, batch }
  },
  component: ReceivingPage,
})

type ReceivingItemRow = BatchWithItems['items'][number]

function ReceivingPage() {
  const { batches, batch: initialBatch } = Route.useLoaderData()
  const router = useRouter()

  const [batch] = useState<BatchWithItems | null>(initialBatch)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'shortage'>('all')

  useEffect(() => {
    if (batch) {
      const initial = Object.fromEntries(
        batch.items.map((i) => [
          i.id,
          parseFloat(i.receivedQuantity ?? i.expectedQuantity ?? '0'),
        ]),
      )
      setQuantities(initial)
    }
  }, [batch])

  const handleQuantityChange = async (itemId: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: value }))
    setIsSaving(true)
    try {
      await upsertBatchItem({ data: { itemId, receivedQuantity: value } })
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!batch) return
    setIsApproving(true)
    try {
      await approveBatch({ data: batch.id })
      router.invalidate()
    } finally {
      setIsApproving(false)
    }
  }

  const getItemStatus = (item: ReceivingItemRow) => {
    const received = quantities[item.id] ?? parseFloat(item.receivedQuantity ?? '0')
    const expected = parseFloat(item.expectedQuantity ?? '0')
    if (received === 0) return 'pending'
    if (received >= expected) return 'matched'
    return 'shortage'
  }

  const displayItems =
    batch?.items.filter((item) => {
      if (filterStatus === 'shortage') return getItemStatus(item) === 'shortage'
      return true
    }) ?? []

  const flaggedCount = batch?.items.filter((i) => getItemStatus(i) === 'shortage').length ?? 0
  const totalReceived = Object.values(quantities).reduce((sum, v) => sum + v, 0)
  const progressPct = batch ? Math.round((batch.verifiedItems / batch.totalItems) * 100) : 0

  const columns: ColumnDef<ReceivingItemRow>[] = [
    {
      key: 'sku',
      header: 'SKU / Item Description',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground text-xs">
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
          {item.expectedQuantity} {item.productUnit}
        </span>
      ),
    },
    {
      key: 'actual',
      header: 'Actual (Edit)',
      render: (item) => (
        <QuantityStepper
          value={quantities[item.id] ?? 0}
          onChange={(v) => handleQuantityChange(item.id, v)}
          min={0}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const status = getItemStatus(item)
        const received = quantities[item.id] ?? 0
        const expected = parseFloat(item.expectedQuantity ?? '0')
        const diff = received - expected
        return (
          <StatusBadge
            status={status}
            className={
              status === 'shortage'
                ? 'after:ml-1 after:content-["(' + diff + ')"]'
                : ''
            }
          />
        )
      },
    },
  ]

  if (batches.length === 0) {
    return (
      <AppLayout headerPlaceholder="Search orders, SKUs...">
        <EmptyState
          title="No receiving batches"
          description="Batches are created automatically when shopping lists are completed."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout headerPlaceholder="Search orders, SKUs...">
      {/* Batch Header */}
      {batch && (
        <div className="mb-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <span>Batch ID</span>
            <span className="font-mono text-primary">#{batch.batchRef}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Receiving &amp; Staging</h1>
                <StatusBadge status={batch.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Audit the incoming shipment from{' '}
                <strong>{batch.supplierName}</strong>. Arrived today at{' '}
                {formatTime(batch.createdAt)}. Compare expected manifest against
                physical counts before finalizing into inventory.
              </p>
            </div>

            {/* Batch Progress */}
            <div className="min-w-48 rounded-xl border bg-card p-4 shadow-sm">
              <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Batch Progress
              </p>
              <p className="text-2xl font-bold">{progressPct}%{' '}
                <span className="text-sm font-normal text-muted-foreground">Verified</span>
              </p>
              <Progress value={progressPct} className="mt-2 h-2" />
              <p className="mt-1.5 text-right text-xs text-muted-foreground">
                {batch.verifiedItems} / {batch.totalItems} Items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter / Sort Row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setFilterStatus((p) => (p === 'shortage' ? 'all' : 'shortage'))
            }
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === 'shortage'
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'hover:bg-muted'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {filterStatus === 'shortage' ? 'Filter: Shortages Only' : 'Filter: All Discrepancies'}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort by: Category
          </button>
        </div>
        <span className="text-xs italic text-muted-foreground">
          {isSaving ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : (
            'Auto-saving local edits...'
          )}
        </span>
      </div>

      {/* Table */}
      <div className="mb-20 rounded-xl border bg-card shadow-sm">
        <DataTable
          data={displayItems}
          columns={columns}
          emptyMessage="No items match the current filter."
        />
      </div>

      {/* Sticky Footer */}
      {batch && (
        <div className="fixed bottom-0 left-60 right-0 border-t bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Total Items Received
                </p>
                <p className="text-xl font-bold text-primary">
                  {Math.round(totalReceived)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    Units
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Flagged Issues
                </p>
                <p className="text-xl font-bold text-red-600">
                  {String(flaggedCount).padStart(2, '0')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">Hold Batch</Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving || batch.status === 'verified'}
                className="gap-2"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve &amp; Add to Pantry
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
