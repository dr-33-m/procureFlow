import { useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useShoppingLists, useDeleteShoppingList, useGenerateDraftFromDefaults } from '@/hooks/use-shopping-lists'
import { usePermissions } from '@/hooks/use-permissions'
import { buildShoppingListColumns } from './shopping-list-columns'

const STATUS_FILTERS = ['all', 'draft', 'pending', 'shopping', 'in_review', 'on_hold', 'completed'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  draft: 'Draft',
  pending: 'Pending',
  shopping: 'Shopping',
  in_review: 'In Review',
  on_hold: 'On Hold',
  completed: 'Completed',
}

const routeApi = getRouteApi('/shopping-lists/')

export function ShoppingListsPage() {
  const { filter } = routeApi.useSearch()
  const navigate = useNavigate({ from: '/shopping-lists/' })
  const { data: lists = [] } = useShoppingLists()
  const deleteMutation = useDeleteShoppingList()
  const { canCreateShoppingList } = usePermissions()
  const isRunner = !canCreateShoppingList
  const generateMutation = useGenerateDraftFromDefaults()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: (list) => {
        if (list) navigate({ to: '/shopping-lists/$id', params: { id: list.id } })
      },
    })
  }

  const pendingDeleteList = lists.find((l) => l.id === pendingDeleteId)

  const activeFilter = (filter as StatusFilter | undefined) ?? 'all'

  const setFilter = (f: StatusFilter) =>
    navigate({ search: (prev) => ({ ...prev, filter: f === 'all' ? undefined : f }) })

  const filtered = activeFilter === 'all' ? lists : lists.filter((l) => l.status === activeFilter)

  return (
    <AppLayout>
      <PageHeader
        title="Shopping Lists"
        breadcrumb={[{ label: 'Procurement' }, { label: 'Lists' }]}
        actions={
          canCreateShoppingList ? (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Generate This Week's List</span>
              </Button>
              <Link to="/shopping-lists/create">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New List
                </Button>
              </Link>
            </>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1 w-fit max-w-full">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === s
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {STATUS_LABELS[s]}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {s === 'all' ? lists.length : lists.filter((l) => l.status === s).length}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState
            title="No lists found"
            description={
              isRunner
                ? 'No shopping lists have been assigned to you yet.'
                : 'Create your first shopping list to get started.'
            }
            action={
              canCreateShoppingList ? (
                <Link to="/shopping-lists/create">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create New List
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            data={filtered}
            columns={buildShoppingListColumns({
              onDelete: (id) => setPendingDeleteId(id),
              deletingId: deleteMutation.isPending ? (deleteMutation.variables as string) : undefined,
              isRunner,
            })}
          />
        )}
      </div>
      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete draft?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{pendingDeleteList?.name}</span> will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (pendingDeleteId) {
                  deleteMutation.mutate(pendingDeleteId, {
                    onSuccess: () => setPendingDeleteId(null),
                  })
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
