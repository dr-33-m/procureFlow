import { useMemo } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ExternalLink, TrendingUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { IssuanceFilters } from './issuance-filters'
import { IssuanceTable } from './issuance-table'
import { DeductionCart } from './deduction-cart'
import { useInventoryForIssuance, useRecentIssuances, useTodayIssuanceStats } from '@/hooks/use-issuance'
import { formatQuantity, formatTime } from '@/lib/format'

const routeApi = getRouteApi('/issuance/')

export function IssuancePage() {
  const { q, category } = routeApi.useSearch()

  const { data: inventory = [] } = useInventoryForIssuance()
  const { data: recentIssuances = [] } = useRecentIssuances()
  const { data: todayStats } = useTodayIssuanceStats()

  const categories = useMemo(
    () => Array.from(new Set(inventory.map((i) => i.category))).sort(),
    [inventory],
  )

  const filteredInventory = useMemo(() => {
    const lower = (q ?? '').toLowerCase()
    const cat = category ?? 'all'
    return inventory.filter((item) => {
      const matchesSearch =
        !lower ||
        item.name.toLowerCase().includes(lower) ||
        (item.barcode?.toLowerCase().includes(lower) ?? false)
      const matchesCategory = cat === 'all' || item.category === cat
      return matchesSearch && matchesCategory
    })
  }, [inventory, q, category])

  const deltaSign = (todayStats?.deltaPercent ?? 0) >= 0 ? '+' : ''

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Inventory Management
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Stock Issuance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record stock departures from the central pantry for kitchen operations.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/issuance/activity" search={{ page: 1 }}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              View All Activity
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats + Recent */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="col-span-1 rounded-xl bg-primary p-5 text-primary-foreground shadow-sm">
          <p className="mb-1 text-xs font-semibold tracking-wider uppercase opacity-70">
            Today's Total Issuance
          </p>
          <p className="text-4xl font-bold">{Math.round(todayStats?.todayCount ?? 0)}</p>
          <p className="mt-0.5 text-sm opacity-80">Units issued today</p>
          {(todayStats?.yesterdayCount ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm opacity-80">
              <TrendingUp className="h-4 w-4" />
              {deltaSign}{todayStats?.deltaPercent}% vs. yesterday
            </div>
          )}
        </div>

        <div className="col-span-1 rounded-xl border bg-card p-4 shadow-sm sm:col-span-2">
          <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Recent Issuances
          </p>
          <div className="divide-y">
            {recentIssuances.slice(0, 3).map((issuance) => (
              <div key={issuance.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{issuance.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {issuance.station ?? 'Unknown'} · {formatTime(issuance.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {formatQuantity(issuance.quantityStock)} {issuance.stockUnit}
                </span>
              </div>
            ))}
            {recentIssuances.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">No recent issuances.</p>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <IssuanceFilters
        categories={categories}
        filteredCount={filteredInventory.length}
        totalCount={inventory.length}
      />

      {/* Table */}
      <IssuanceTable inventory={filteredInventory} />

      {/* Floating Deduction Cart */}
      <div className="fixed bottom-4 right-4 z-30">
        <DeductionCart />
      </div>
    </AppLayout>
  )
}
