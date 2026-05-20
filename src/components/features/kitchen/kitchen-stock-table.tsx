import { Package, Users, ChefHat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatQuantity, formatRelativeTime } from '@/lib/format'

type Row = {
  id: string
  productId: string
  productName: string | null
  productCategory: string | null
  stockUnit: string | null
  baseUnit: string | null
  quantityIssued: string
  quantityRemaining: string
  expectedGuestCount: number | null
  expectedServings: number | null
  menuId: string | null
  menuName: string | null
  menuMealType: string | null
  eventTag: string | null
  status: string
  issuedAt: Date | string
  reconciledAt: Date | string | null
  notes: string | null
}

interface KitchenStockTableProps {
  rows: Row[]
  emptyMessage?: string
}

export function KitchenStockTable({ rows, emptyMessage }: KitchenStockTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing to reconcile"
        description={
          emptyMessage ??
          'Once the manager issues stock for a service, it lands here for the chef to close out at EOD.'
        }
      />
    )
  }

  // Group by mealType+menu so each service is a section
  const groups = new Map<string, { label: string; rows: Row[] }>()
  for (const r of rows) {
    const key =
      r.menuName || (r.menuMealType ?? 'Other') + (r.eventTag ? ` · ${r.eventTag}` : '')
    if (!groups.has(key)) groups.set(key, { label: key, rows: [] })
    groups.get(key)!.rows.push(r)
  }

  return (
    <div className="space-y-6">
      {[...groups.values()].map((group) => {
        const firstRow = group.rows[0]
        return (
          <section key={group.label}>
            <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{group.label}</h2>
                {firstRow.menuMealType && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {firstRow.menuMealType}
                  </Badge>
                )}
                {firstRow.eventTag && (
                  <Badge variant="outline" className="text-xs">
                    {firstRow.eventTag}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {firstRow.expectedGuestCount && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {firstRow.expectedGuestCount} guests planned
                  </span>
                )}
                <span>Issued {formatRelativeTime(firstRow.issuedAt)}</span>
              </div>
            </div>
            <div className="rounded-lg border bg-card divide-y">
              {group.rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.productName}</p>
                    {row.productCategory && (
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {row.productCategory}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatQuantity(row.quantityIssued)} {row.stockUnit}
                    </p>
                    {row.status === 'partial' && (
                      <p className="text-[10px] text-amber-700">
                        {formatQuantity(row.quantityRemaining)} unreconciled
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={row.status === 'reconciled' ? 'default' : 'outline'}
                    className="text-[9px] h-5 px-1.5 shrink-0 capitalize"
                  >
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
