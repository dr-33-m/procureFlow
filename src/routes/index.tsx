import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Calendar,
  Download,
  Upload,
  AlertTriangle,
  ShoppingCart,
  Plus,
  ClipboardList,
  ChevronRight,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { getDashboardStats, getRecentListActivity } from '@/server/dashboard'
import { formatDate, formatCurrency, formatCurrencyFull, formatRelativeTime } from '@/lib/format'
import { getCurrentShift } from '@/lib/constants'
import type { RecentListActivity } from '@/types'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [stats, recentActivity] = await Promise.all([
      getDashboardStats(),
      getRecentListActivity(),
    ])
    return { stats, recentActivity }
  },
  component: Dashboard,
})

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
        <StatusBadge status={row.status === 'pending' ? 'pending_approval' : row.status} className="mt-0.5" />
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

function Dashboard() {
  const { stats, recentActivity } = Route.useLoaderData()
  const today = new Date()
  const shift = getCurrentShift()

  return (
    <AppLayout headerPlaceholder="Search resources...">
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Operational Dashboard
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(today)} • {shift}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Top Row */}
      <div className="mb-4 grid grid-cols-3 gap-4">
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
              <p className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{stats.totalCategories}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valuation</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValuation)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">In Stock</span>
              <span className="font-semibold">{stats.inStockPct}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Low Stock</span>
              <span className="font-semibold">{stats.lowStockPct}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Out of Stock</span>
              <span className="font-semibold">{stats.outOfStockPct}%</span>
            </span>
          </div>
        </div>

        {/* Critical Warnings */}
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Critical Warnings
          </p>
          <p className="my-1 text-4xl font-bold text-red-600">
            {String(stats.criticalWarnings).padStart(2, '0')}
          </p>
          <p className="mb-4 text-sm text-red-600">
            Low stock alerts require immediate review.
          </p>
          <Link to="/pantry">
            <Button
              variant="destructive"
              className="w-full"
            >
              Resolve Alerts
            </Button>
          </Link>
        </div>

        {/* Active Shopping Lists */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              In Progress
            </span>
          </div>
          <p className="text-4xl font-bold">{stats.activeShoppingLists}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Active Shopping Lists
          </p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Value: {formatCurrency(stats.activeListsValue)}
            </span>
            <Link to="/shopping-lists" className="font-semibold text-primary hover:underline">
              View Lists
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions + Bottom Row */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="col-span-2 rounded-xl border bg-muted/50 p-1">
          <div className="grid grid-cols-2 gap-1 h-full">
            <Link
              to="/shopping-lists/create"
              className="flex items-center gap-3 rounded-lg bg-card p-4 hover:bg-accent transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Plus className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">Create New List</span>
            </Link>
            <Link
              to="/receiving"
              className="flex items-center gap-3 rounded-lg bg-card p-4 hover:bg-accent transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground">
                <ClipboardList className="h-5 w-5 text-background" />
              </div>
              <span className="font-semibold">Review Receiving</span>
            </Link>
          </div>
        </div>

        {/* Placeholder / additional stat */}
        <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Today's Activity
          </p>
          <div>
            <p className="text-3xl font-bold">{recentActivity.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Recent list updates</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Recent List Activity</h2>
          <Link
            to="/shopping-lists"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <DataTable
          data={recentActivity}
          columns={activityColumns}
          emptyMessage="No recent list activity."
        />
      </div>
    </AppLayout>
  )
}
