import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  EggFried,
  PackageMinus,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import type { RecentListActivity } from '@/types'
import type { ColumnDef } from '@/components/ui/data-table'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDashboardStats, useRecentActivity } from '@/hooks/use-dashboard'
import {
  formatCurrency,
  formatCurrencyFull,
  formatDate,
  formatQuantity,
  formatRelativeTime,
} from '@/lib/format'
import { getCurrentShift } from '@/lib/constants'

function ActivityIcon({ type }: { type: RecentListActivity['type'] }) {
  const className =
    type === 'issuance'
      ? 'bg-red-50 text-red-600'
      : type === 'reconciliation'
        ? 'bg-green-50 text-green-600'
        : 'bg-blue-50 text-blue-600'

  const Icon =
    type === 'issuance'
      ? PackageMinus
      : type === 'reconciliation'
        ? ClipboardCheck
        : ClipboardList

  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${className}`}>
      <Icon className="h-4 w-4" />
    </div>
  )
}

function activityBadgeClassName(type: RecentListActivity['type']) {
  if (type === 'issuance') return 'border-red-200 bg-red-50 text-red-700'
  if (type === 'reconciliation') return 'border-green-200 bg-green-50 text-green-700'
  return 'border-blue-200 bg-blue-50 text-blue-700'
}

function activityActorLabel(type: RecentListActivity['type']) {
  if (type === 'issuance') return 'Issued by'
  if (type === 'reconciliation') return 'Reconciled by'
  return 'Modified by'
}

const activityColumns: Array<ColumnDef<RecentListActivity>> = [
  {
    key: 'name',
    header: 'Activity',
    render: (row) => (
      <div className="flex items-start gap-3">
        <ActivityIcon type={row.type} />
        <div className="min-w-0">
          <Badge
            variant="outline"
            className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${activityBadgeClassName(row.type)}`}
          >
            {row.label}
          </Badge>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.detail}</p>
          <p className="text-xs text-muted-foreground">
            {activityActorLabel(row.type)} {row.modifiedBy} •{' '}
            {formatRelativeTime(row.modifiedAt)}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'value',
    header: 'Summary',
    headerClassName: 'text-right',
    className: 'text-right',
    render: (row) => {
      if (row.type === 'shopping_list') {
        return (
          <div className="text-right">
            <p className="font-semibold">{formatCurrencyFull(row.value)}</p>
            <StatusBadge
              status={row.status === 'pending' ? 'pending_approval' : row.status}
              className="mt-0.5"
            />
          </div>
        )
      }

      if (row.type === 'issuance') {
        return (
          <div className="text-right">
            <p className="font-semibold text-red-600">
              −{formatQuantity(row.value)} {row.unit}
            </p>
            <Badge variant="outline" className="mt-0.5 border-red-200 bg-red-50 text-red-700">
              Issued
            </Badge>
          </div>
        )
      }

      return (
        <div className="text-right">
          <p className="font-semibold">
            {formatQuantity(row.value)} {row.unit}
          </p>
          <Badge
            variant="outline"
            className="mt-0.5 border-green-200 bg-green-50 text-green-700"
          >
            Reconciled
          </Badge>
        </div>
      )
    },
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

  const today = new Date()
  const shift = getCurrentShift()

  return (
    <>
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
            Low or out-of-stock items require immediate review.
          </p>
          <Link
            to="/pantry"
            search={{
              page: 1,
              category: undefined,
              sortBy: undefined,
              stockStatus: 'attention',
              q: undefined,
            }}
          >
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
          <Link
            to="/shopping-lists/create"
            search={{ ai: true }}
            className="flex items-center gap-3 rounded-lg bg-card p-3 hover:bg-accent transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600">
              <EggFried className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <span className="block font-semibold">Create List with Procly</span>
              <span className="text-xs text-muted-foreground">
                Generate from learned rates &amp; menus
              </span>
            </div>
          </Link>
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
          onRowClick={(row) => {
            if (row.type === 'shopping_list') {
              navigate({ to: '/shopping-lists/$id', params: { id: row.id } })
              return
            }

            if (row.type === 'issuance') {
              navigate({ to: '/issuance/activity', search: { page: 1 } })
              return
            }

            navigate({ to: '/kitchen' })
          }}
        />
      </div>
    </>
  )
}
