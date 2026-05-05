import { Link, useNavigate } from '@tanstack/react-router'
import {
  Calendar,
  AlertTriangle,
  ShoppingCart,
  Plus,
  ClipboardList,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { useDashboardStats, useRecentActivity } from '@/hooks/use-dashboard'
import { useGenerateDraftFromDefaults } from '@/hooks/use-shopping-lists'
import { formatDate, formatCurrency, formatCurrencyFull, formatRelativeTime } from '@/lib/format'
import { getCurrentShift } from '@/lib/constants'
import type { RecentListActivity } from '@/types'

const activityColumns: ColumnDef<RecentListActivity>[] = [
  {
    key: 'name',
    header: 'List Name',
    render: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">
          Modified by {row.modifiedBy} • {formatRelativeTime(row.modifiedAt)}
        </p>
      </div>
    ),
  },
  {
    key: 'value',
    header: 'Value',
    headerClassName: 'text-right',
    className: 'text-right',
    render: (row) => (
      <div className="text-right">
        <p className="font-semibold">{formatCurrencyFull(row.value)}</p>
        <StatusBadge
          status={row.status === 'pending' ? 'pending_approval' : row.status}
          className="mt-0.5"
        />
      </div>
    ),
  },
  {
    key: 'arrow',
    header: '',
    className: 'w-8',
    render: () => <ChevronRight className="h-4 w-4 text-muted-foreground" />,
  },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: stats } = useDashboardStats()
  const { data: recentActivity = [] } = useRecentActivity()
  const generateMutation = useGenerateDraftFromDefaults()

  const handleQuickGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: (list) => {
        if (list) navigate({ to: '/shopping-lists/$id', params: { id: list.id } })
      },
    })
  }

  const today = new Date()
  const shift = getCurrentShift()

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Operational Dashboard
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(today)} • {shift}
            </span>
          </div>
        </div>
      </div>

      {/* Top Row */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Pantry Overview */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3">
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">
              Live Status
            </p>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Pantry Overview</h2>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{(stats?.totalItems ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{stats?.totalCategories ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valuation</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalValuation ?? 0)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">In Stock</span>
              <span className="font-semibold">{stats?.inStockPct ?? 0}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Low Stock</span>
              <span className="font-semibold">{stats?.lowStockPct ?? 0}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Out of Stock</span>
              <span className="font-semibold">{stats?.outOfStockPct ?? 0}%</span>
            </span>
          </div>
        </div>

        {/* Critical Warnings */}
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Critical Warnings</p>
          <p className="my-1 text-4xl font-bold text-red-600">
            {String(stats?.criticalWarnings ?? 0).padStart(2, '0')}
          </p>
          <p className="mb-4 text-sm text-red-600">
            Low stock alerts require immediate review.
          </p>
          <Link to="/pantry" search={{ page: 1, category: undefined, sortBy: undefined, q: undefined }}>
            <Button variant="destructive" className="w-full">
              Resolve Alerts
            </Button>
          </Link>
        </div>

        {/* Active Shopping Lists */}
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              In Progress
            </span>
          </div>
          <p className="text-4xl font-bold">{stats?.activeShoppingLists ?? 0}</p>
          <p className="mt-1 text-sm text-muted-foreground">Active Shopping Lists</p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Value: {formatCurrency(stats?.activeListsValue ?? 0)}
            </span>
            <Link to="/shopping-lists" search={{ filter: undefined }} className="font-semibold text-primary hover:underline">
              View Lists
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4 rounded-xl border bg-muted/50 p-0.5">
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={handleQuickGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-3 rounded-lg bg-card p-3 hover:bg-accent transition-colors disabled:opacity-60"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600">
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Sparkles className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="text-left">
              <span className="block font-semibold">
                {generateMutation.isPending ? 'Generating…' : 'Generate This Week\'s List'}
              </span>
              <span className="text-xs text-muted-foreground">Auto-fill from history &amp; par levels</span>
            </div>
          </button>
          <Link
            to="/shopping-lists/create"
            className="flex items-center gap-3 rounded-lg bg-card p-3 hover:bg-accent transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Create New List</span>
          </Link>
          <Link
            to="/receiving"
            className="flex items-center gap-3 rounded-lg bg-card p-3 hover:bg-accent transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground">
              <ClipboardList className="h-4 w-4 text-background" />
            </div>
            <span className="font-semibold">Review Receiving</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Recent List Activity</h2>
          <Link
            to="/shopping-lists"
            search={{ filter: undefined }}
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <DataTable
          data={recentActivity}
          columns={activityColumns}
          emptyMessage="No recent list activity."
          onRowClick={(row) =>
            navigate({ to: '/shopping-lists/$id', params: { id: row.id } })
          }
        />
      </div>
    </AppLayout>
  )
}
