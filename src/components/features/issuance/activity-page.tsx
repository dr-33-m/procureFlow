import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, PackageMinus } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAllIssuances } from '@/hooks/use-issuance'
import { formatDate, formatTime, formatQuantity } from '@/lib/format'

const PAGE_SIZE = 20
const routeApi = getRouteApi('/issuance/activity')

type ActivityRow = {
  id: string
  productName: string
  stockUnit: string
  station: string | null
  createdAt: Date
  quantityStock: string
  method: string
  issuedBy: string
}

const columns: ColumnDef<ActivityRow>[] = [
  {
    key: 'datetime',
    header: 'Date / Time',
    render: (row) => (
      <div>
        <p className="text-sm font-medium">{formatDate(row.createdAt)}</p>
        <p className="text-xs text-muted-foreground">{formatTime(row.createdAt)}</p>
      </div>
    ),
  },
  {
    key: 'product',
    header: 'Product',
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <PackageMinus className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="font-medium">{row.productName}</p>
      </div>
    ),
  },
  {
    key: 'qty',
    header: 'Qty Deducted',
    render: (row) => (
      <span className="font-semibold text-red-600">
        {formatQuantity(Math.abs(parseFloat(row.quantityStock ?? '0')).toString())}
      </span>
    ),
  },
  {
    key: 'station',
    header: 'Station',
    render: (row) => <span className="text-sm">{row.station ?? '—'}</span>,
  },
  {
    key: 'method',
    header: 'Method',
    hideOnMobile: true,
    render: (row) => (
      <Badge variant="secondary" className="text-xs font-semibold uppercase">
        {row.method}
      </Badge>
    ),
  },
  {
    key: 'issuedBy',
    header: 'Issued By',
    hideOnMobile: true,
    render: (row) => <span className="text-sm text-muted-foreground">{row.issuedBy}</span>,
  },
]

export function ActivityPage() {
  const { page } = routeApi.useSearch()
  const navigate = useNavigate({ from: '/issuance/activity' })

  const { data } = useAllIssuances(page, PAGE_SIZE)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const goToPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }) })

  return (
    <AppLayout>
      <>
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/issuance" search={{ category: undefined, q: undefined }} className="hover:text-foreground transition-colors">
                Stock Issuance
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Activity Log</span>
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">All Issuance Activity</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete history of stock deductions from the central pantry.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    className="gap-2 cursor-not-allowed opacity-60"
                    disabled
                    tabIndex={-1}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                    <Badge variant="secondary" className="ml-0.5 text-xs">Soon</Badge>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming Soon</TooltipContent>
            </Tooltip>

            <Link to="/issuance" search={{ category: undefined, q: undefined }}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Transaction Log</h2>
              <p className="text-xs text-muted-foreground">{total} records total</p>
            </div>
            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                Showing <strong>{start}–{end}</strong> of {total}
              </span>
            )}
          </div>

          <DataTable
            data={items}
            columns={columns}
            emptyMessage="No issuance activity recorded yet."
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
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
                    onClick={() => goToPage(p)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium ${
                      page === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
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
                    onClick={() => goToPage(totalPages)}
                    className="h-8 w-8 rounded-lg text-sm font-medium hover:bg-muted"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </>
    </AppLayout>
  )
}
