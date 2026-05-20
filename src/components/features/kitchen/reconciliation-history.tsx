import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatQuantity, formatDate } from '@/lib/format'

type Item = {
  id: string
  productName: string | null
  stockUnit: string | null
  quantityUsed: string
  quantityWaste: string
  quantityLeftover: string
  reason: string
  reasonNotes: string | null
}

type Row = {
  id: string
  serviceDate: string
  mealType: string
  eventTag: string | null
  actualGuestCount: number
  actualServings: number
  reorderRatio: string | null
  notes: string | null
  reportedAt: Date | string
  createdByName: string | null
  items: Item[]
}

interface ReconciliationHistoryProps {
  rows: Row[]
}

export function ReconciliationHistory({ rows }: ReconciliationHistoryProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No reconciliations yet"
        description="As you close out services, the system learns your real per-guest rates and the issuance agent gets sharper."
      />
    )
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const ratio = r.reorderRatio ? parseFloat(r.reorderRatio) : null
        const uplift = ratio ? Math.round((ratio - 1) * 100) : 0
        return (
          <article key={r.id} className="rounded-lg border bg-card p-4">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {r.mealType}
                  </Badge>
                  {r.eventTag && (
                    <Badge variant="outline" className="text-xs">
                      {r.eventTag}
                    </Badge>
                  )}
                  <span className="text-xs font-medium">
                    {formatDate(r.serviceDate)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.actualGuestCount} guests · {r.actualServings} servings
                  {ratio && ratio !== 1 && (
                    <>
                      {' '}
                      ·{' '}
                      <span
                        className={
                          uplift > 0 ? 'text-amber-700 font-medium' : 'text-muted-foreground'
                        }
                      >
                        {uplift > 0 ? `+${uplift}%` : `${uplift}%`} reorder
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0 text-[10px] text-muted-foreground">
                {r.createdByName && <div>by {r.createdByName}</div>}
              </div>
            </header>

            {r.notes && (
              <p className="mb-3 rounded bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
                {r.notes}
              </p>
            )}

            <ul className="space-y-1">
              {r.items.map((it) => (
                <li key={it.id} className="flex items-baseline gap-2 text-sm">
                  <span className="font-mono text-xs w-24 shrink-0 tabular-nums">
                    {formatQuantity(it.quantityUsed)} {it.stockUnit}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{it.productName}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0">
                    {it.reason}
                  </Badge>
                  {(parseFloat(it.quantityWaste) > 0 ||
                    parseFloat(it.quantityLeftover) > 0) && (
                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                      {parseFloat(it.quantityWaste) > 0 &&
                        `${formatQuantity(it.quantityWaste)} waste`}
                      {parseFloat(it.quantityWaste) > 0 &&
                        parseFloat(it.quantityLeftover) > 0 &&
                        ' · '}
                      {parseFloat(it.quantityLeftover) > 0 &&
                        `${formatQuantity(it.quantityLeftover)} left`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </div>
  )
}
