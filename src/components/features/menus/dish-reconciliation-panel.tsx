import { useState } from 'react'
import { ChevronDown, ChevronUp, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useMenuReconciliationStats } from '@/hooks/use-menus'
import { formatQuantity } from '@/lib/format'

interface DishReconciliationPanelProps {
  menuId: string
}

export function DishReconciliationPanel({ menuId }: DishReconciliationPanelProps) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useMenuReconciliationStats(menuId)

  if (isLoading || !data || data.dishes.length === 0) return null

  // Show the panel only if at least one ingredient has a learned rate from
  // real consumption — otherwise it's all "no data yet" which is noise.
  const hasLearnedData = data.dishes.some((d) =>
    d.ingredients.some(
      (i) =>
        (i.source === 'reconciliation' || i.source === 'issuance') &&
        i.learnedPerGuestStock !== null,
    ),
  )
  if (!hasLearnedData) return null

  return (
    <div className="mb-4 rounded-lg border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/40"
      >
        <div className="flex items-center gap-2 text-left">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Recipe vs. reality</p>
            <p className="text-xs text-muted-foreground">
              How recent reconciliations compare to the configured recipes.
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t px-4 py-3">
          {data.dishes.map((dish) => (
            <div key={dish.dishId} className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dish.dishName}
              </p>
              <div className="space-y-1">
                {dish.ingredients.map((ing) => {
                  const hasLearned =
                    (ing.source === 'reconciliation' || ing.source === 'issuance') &&
                    ing.learnedPerGuestStock !== null
                  return (
                    <div
                      key={ing.productId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="flex-1 min-w-0 truncate">{ing.productName}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        recipe {formatQuantity(ing.configuredPerGuestStock)} {ing.stockUnit}
                      </span>
                      {hasLearned ? (
                        <>
                          <span className="font-mono tabular-nums font-medium">
                            actual {formatQuantity(ing.learnedPerGuestStock as number)}{' '}
                            {ing.stockUnit}
                          </span>
                          <DeltaBadge deltaPct={ing.deltaPct} />
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5"
                            title={`${ing.sampleSize} sample${
                              ing.sampleSize === 1 ? '' : 's'
                            }, source: ${ing.source}`}
                          >
                            {ing.confidence}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">no data yet</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="pt-1 text-[10px] text-muted-foreground italic">
            Segmented by {data.mealType}
            {data.eventTag ? ` · ${data.eventTag}` : ''}. Half-life 30 days; noise reasons
            (waste, training, expiry-driven) excluded.
          </p>
        </div>
      )}
    </div>
  )
}

function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) return null
  const abs = Math.abs(deltaPct)
  if (abs < 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />
        on target
      </span>
    )
  }
  const up = deltaPct > 0
  const tone = up ? 'text-amber-700' : 'text-emerald-700'
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${tone}`}>
      <Icon className="h-2.5 w-2.5" />
      {up ? '+' : ''}
      {deltaPct}%
    </span>
  )
}
