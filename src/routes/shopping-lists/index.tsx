import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, ChevronRight } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getShoppingLists } from '@/server/shopping-lists'
import { formatCurrencyFull, formatRelativeTime } from '@/lib/format'
import type { ShoppingListWithDetails } from '@/types'
import { useState } from 'react'

export const Route = createFileRoute('/shopping-lists/')({
  loader: () => getShoppingLists(),
  component: ShoppingListsPage,
})

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'completed'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

function ShoppingListsPage() {
  const lists = Route.useLoaderData()
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered =
    filter === 'all' ? lists : lists.filter((l) => l.status === filter)

  const columns: ColumnDef<ShoppingListWithDetails>[] = [
    {
      key: 'name',
      header: 'List Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground text-xs">
            ≡
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.itemCount} items
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'creator',
      header: 'Created By',
      render: (row) => (
        <span className="text-sm">{row.creatorName ?? '—'}</span>
      ),
    },
    {
      key: 'runner',
      header: 'Assigned To',
      render: (row) => (
        <span className="text-sm">{row.runnerName ?? 'Unassigned'}</span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (row) => (
        <span className="font-semibold">
          {formatCurrencyFull(row.totalValue ?? '0')}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <Badge
          variant="outline"
          className={
            row.priority === 'urgent'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-border bg-muted text-muted-foreground'
          }
        >
          {row.priority.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'updated',
      header: 'Last Updated',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatRelativeTime(row.updatedAt ?? row.createdAt)}
        </span>
      ),
    },
    {
      key: 'arrow',
      header: '',
      className: 'w-8',
      render: () => <ChevronRight className="h-4 w-4 text-muted-foreground" />,
    },
  ]

  return (
    <AppLayout headerPlaceholder="Search orders, items, or runners...">
      <PageHeader
        title="Shopping Lists"
        breadcrumb={[{ label: 'Procurement' }, { label: 'Lists' }]}
        actions={
          <Link to="/shopping-lists/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create New List
            </Button>
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {STATUS_LABELS[s]}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {s === 'all'
                ? lists.length
                : lists.filter((l) => l.status === s).length}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState
            title="No lists found"
            description="Create your first shopping list to get started."
            action={
              <Link to="/shopping-lists/create">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New List
                </Button>
              </Link>
            }
          />
        ) : (
          <DataTable data={filtered} columns={columns} />
        )}
      </div>
    </AppLayout>
  )
}
