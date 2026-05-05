import { getRouteApi, Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight, ShoppingCart, Users, Calendar } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useShoppingList } from '@/hooks/use-shopping-lists'
import { formatCurrencyFull, formatDate } from '@/lib/format'
import { listDetailColumns } from './list-detail-columns'

const routeApi = getRouteApi('/shopping-lists/$id/')

export function ListDetailPage() {
  const { id } = routeApi.useParams()
  const { data: list } = useShoppingList(id)

  if (!list) {
    return (
      <AppLayout>
        <EmptyState
          title="List not found"
          description="This shopping list may have been deleted or you don't have access."
          action={
            <Link to="/shopping-lists" search={{ filter: undefined }}>
              <Button>Back to Lists</Button>
            </Link>
          }
        />
      </AppLayout>
    )
  }

  const projectedTotal = list.items.reduce(
    (sum, item) =>
      sum +
      parseFloat(item.requestedQuantity ?? '0') * parseFloat(item.pricePerStockUnit ?? '0'),
    0,
  )

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/shopping-lists" search={{ filter: undefined }} className="hover:text-foreground transition-colors">
          Shopping Lists
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate">{list.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold sm:text-3xl">{list.name}</h1>
            <StatusBadge status={list.status} />
            <Badge
              variant="outline"
              className={
                list.priority === 'urgent'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-border bg-muted text-muted-foreground'
              }
            >
              {list.priority.toUpperCase()}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {list.creatorName && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Created by {list.creatorName}
              </span>
            )}
            {list.runnerName ? (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Runner: <span className="font-medium text-foreground">{list.runnerName}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600">
                <Users className="h-3.5 w-3.5" />
                Unassigned
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(list.createdAt)}
            </span>
            {list.guestCount && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {list.guestCount} guests
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(list.status === 'pending' || list.status === 'shopping') && (
            <Link to="/shopping-lists/$id/run" params={{ id }}>
              <Button className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                {list.status === 'shopping' ? 'Runner View' : 'Start Shopping'}
              </Button>
            </Link>
          )}
          <Link to="/shopping-lists" search={{ filter: undefined }}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Items</h2>
            <p className="text-xs text-muted-foreground">{list.items.length} products</p>
          </div>
        </div>

        {list.items.length === 0 ? (
          <EmptyState title="No items" description="This shopping list has no items yet." />
        ) : (
          <DataTable data={list.items} columns={listDetailColumns} />
        )}

        {list.items.length > 0 && (
          <div className="border-t px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {list.items.length} item{list.items.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Projected Total</p>
                  <p className="font-bold text-lg">{formatCurrencyFull(projectedTotal.toString())}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
