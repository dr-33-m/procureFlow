import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Filter,
  ArrowUpDown,
  CheckCircle,
  Loader2,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  useApproveItem,
  useUpdateReceivedQuantity,
  useApproveList,
  useReceivingList,
} from '@/hooks/use-receiving'
import { useUpdateShoppingListStatus } from '@/hooks/use-shopping-lists'
import { formatRelativeTime, formatCurrencyFull } from '@/lib/format'
import { buildReceivingColumns, type ReceivingItemRow } from './receiving-columns'
import { useReceivingConfirmation } from '@/stores/receiving-confirmation'
import { receivingKeys } from '@/lib/query-manager/receiving/keys'

const routeApi = getRouteApi('/receiving/$listId')

export function ReceivingDetailPage() {
  const { listId } = routeApi.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: list } = useReceivingList(listId)

  const baseQuantities = useMemo(
    () =>
      Object.fromEntries(
        (list?.items ?? []).map((i) => [
          i.id,
          parseFloat(i.receivedQuantity ?? '0'),
        ]),
      ),
    [list?.items],
  )
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const quantities = { ...baseQuantities, ...overrides }

  const [filterStatus, setFilterStatus] = useState<'all' | 'flagged'>('all')
  const [sortByCategory, setSortByCategory] = useState(false)
  const [approvedItemIds, setApprovedItemIds] = useState<Set<string>>(new Set())
  const { confirmations, confirmItem, clearItem, clearList } = useReceivingConfirmation()
  const confirmedItemIds = new Set(confirmations[listId] ?? [])

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stableOrderRef = useRef<string[] | null>(null)

  const updateQtyMutation = useUpdateReceivedQuantity()
  const approveItemMutation = useApproveItem()
  const approveListMutation = useApproveList()
  const holdMutation = useUpdateShoppingListStatus()

  const handleQuantityChange = (itemId: string, value: number) => {
    setOverrides((prev) => ({ ...prev, [itemId]: value }))
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateQtyMutation.mutate({ itemId, receivedQuantity: value })
    }, 600)
  }

  const handleConfirmItem = useCallback((itemId: string) => {
    confirmItem(listId, itemId)
  }, [confirmItem, listId])

  const handleApproveItem = (item: ReceivingItemRow) => {
    approveItemMutation.mutate(item.id, {
      onSuccess: () => {
        setApprovedItemIds((prev) => new Set([...prev, item.id]))
        clearItem(listId, item.id)
      },
    })
  }

  const handleApproveAll = () => {
    if (!list) return
    approveListMutation.mutate(list.id, {
      onSuccess: () => {
        clearList(listId)
        navigate({ to: '/receiving' })
      },
    })
  }

  const handleHold = () => {
    if (!list) return
    holdMutation.mutate(
      { id: list.id, status: 'on_hold' },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: receivingKeys.all })
          navigate({ to: '/receiving' })
        },
      },
    )
  }

  const handleResume = () => {
    if (!list) return
    holdMutation.mutate({ id: list.id, status: 'in_review' })
  }

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    setPage(1)
  }, [filterStatus, sortByCategory])

  const getItemStatus = (item: ReceivingItemRow) => {
    const received = quantities[item.id] ?? parseFloat(item.receivedQuantity ?? '0')
    const expected = parseFloat(item.requestedQuantity ?? '0')
    const confirmed = confirmedItemIds.has(item.id)
    if (!confirmed && received === 0) return 'pending' as const
    if (received > expected) return 'surplus' as const
    if (received > 0 && received >= expected) return 'matched' as const
    return 'shortage' as const
  }

  if (!list) {
    return (
      <AppLayout>
        <EmptyState
          title="List not found"
          description="This shopping list may have been deleted or you don't have access."
          action={
            <Button onClick={() => navigate({ to: '/receiving' })} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Receiving
            </Button>
          }
        />
      </AppLayout>
    )
  }

  // Freeze the display order on first load so refetches never reorder rows mid-session
  if (!stableOrderRef.current) {
    stableOrderRef.current = list.items.map((i) => i.id)
  }
  const stableIndexMap = Object.fromEntries(
    stableOrderRef.current.map((id, idx) => [id, idx]),
  )

  let displayItems = list.items.filter((item) => {
    if (filterStatus === 'flagged') {
      const s = getItemStatus(item)
      return s === 'shortage' || s === 'surplus'
    }
    return true
  })

  if (sortByCategory) {
    displayItems = [...displayItems].sort((a, b) =>
      (a.productCategory ?? '').localeCompare(b.productCategory ?? ''),
    )
  } else {
    displayItems = [...displayItems].sort(
      (a, b) => (stableIndexMap[a.id] ?? 0) - (stableIndexMap[b.id] ?? 0),
    )
  }

  const flaggedCount = list.items.filter((i) => {
    const s = getItemStatus(i)
    return s === 'shortage' || s === 'surplus'
  }).length
  const allConfirmed = list.items.length > 0 && list.items.every((i) => confirmedItemIds.has(i.id))
  const progressPct = list.totalItems
    ? Math.round((list.verifiedItems / list.totalItems) * 100)
    : 0
  const listCompleted = list.status === 'completed'
  const listOnHold = list.status === 'on_hold'

  const expectedSpend = list.items.reduce((sum, item) => {
    const price = parseFloat(item.pricePerStockUnit ?? '0')
    const qty = parseFloat(item.purchasedQuantity ?? '0')
    return sum + price * qty
  }, 0)

  const actualSpend = list.items.reduce((sum, item) => {
    const price = parseFloat(item.pricePerStockUnit ?? '0')
    const received = quantities[item.id] ?? 0
    return sum + price * received
  }, 0)

  const columns = buildReceivingColumns({
    quantities,
    listCompleted,
    getItemStatus,
    handleQuantityChange,
    handleApproveItem,
    handleConfirmItem,
    approveItemMutation: {
      isPending: approveItemMutation.isPending,
      variables: approveItemMutation.variables,
    },
    approvedItemIds,
    confirmedItemIds,
  })

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <Link to="/receiving" className="hover:text-foreground transition-colors">
            Receiving
          </Link>
          <span>/</span>
          <span className="text-primary normal-case">{list.name}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold sm:text-3xl">
                Receiving — {list.name}
              </h1>
              <StatusBadge status={list.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {list.runnerName && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Runner:{' '}
                  <span className="font-medium text-foreground">{list.runnerName}</span>
                </span>
              )}
              <span>
                In Review since{' '}
                {formatRelativeTime(list.updatedAt ?? list.createdAt)}
              </span>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-xl border bg-card p-4 shadow-sm sm:w-52">
            <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Count Progress
            </p>
            <p className="text-2xl font-bold">
              {progressPct}%{' '}
              <span className="text-sm font-normal text-muted-foreground">Counted</span>
            </p>
            <Progress value={progressPct} className="mt-2 h-2" />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              {list.verifiedItems} / {list.totalItems} Items
            </p>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus((p) => (p === 'flagged' ? 'all' : 'flagged'))}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === 'flagged'
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'hover:bg-muted'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {filterStatus === 'flagged' ? 'Flagged Only' : 'All Items'}
          </button>

          <button
            type="button"
            onClick={() => setSortByCategory((p) => !p)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              sortByCategory
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'hover:bg-muted'
            }`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort by Category
          </button>
        </div>

        <span className="text-xs italic text-muted-foreground">
          {updateQtyMutation.isPending ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : (
            'Auto-saving edits...'
          )}
        </span>
      </div>

      {/* Table */}
      <div className="mb-28 overflow-x-auto rounded-xl border bg-card shadow-sm">
        <DataTable
          data={displayItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
          columns={columns}
          emptyMessage="No items match the current filter."
        />
        {displayItems.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayItems.length)} of{' '}
              {displayItems.length}
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
                disabled={page === Math.ceil(displayItems.length / PAGE_SIZE)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-4 md:left-(--sidebar-width,16rem)">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Expected Spend
              </p>
              <p className="text-xl font-bold">{formatCurrencyFull(expectedSpend)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Actual Spend
              </p>
              <p className={`text-xl font-bold ${actualSpend > expectedSpend ? 'text-red-600' : 'text-primary'}`}>
                {formatCurrencyFull(actualSpend)}
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
            {listOnHold && !listCompleted && (
              <Button
                variant="outline"
                disabled={holdMutation.isPending}
                onClick={handleResume}
              >
                {holdMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Resume
              </Button>
            )}
            {!listOnHold && !listCompleted && (
              <Button
                variant="outline"
                disabled={holdMutation.isPending}
                onClick={handleHold}
              >
                {holdMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Hold
              </Button>
            )}
            <Button
              onClick={handleApproveAll}
              disabled={approveListMutation.isPending || listCompleted || listOnHold || !allConfirmed}
              className="gap-2"
            >
              {approveListMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve All &amp; Add to Pantry
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
