import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRecordReconciliation } from '@/hooks/use-kitchen'
import { formatQuantity } from '@/lib/format'

type Reason =
  | 'normal'
  | 'reorder-uplift'
  | 'expiry-driven'
  | 'substitution'
  | 'menu-change'
  | 'waste-spoilage'
  | 'waste-overcook'
  | 'training'
  | 'other'

type DraftItem = {
  kitchenStockId: string
  productId: string
  productName: string
  stockUnit: string
  quantityUsed: number
  quantityWaste?: number
  quantityLeftover?: number
  reason: Reason
  reasonNotes?: string
}

type Draft = {
  summary: string
  serviceDate: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'event'
  eventTag?: string
  actualGuestCount: number
  actualServings: number
  notes?: string
  items: DraftItem[]
}

const REASON_LABEL: Record<Reason, string> = {
  normal: 'Normal',
  'reorder-uplift': 'Reorder uplift',
  'expiry-driven': 'Expiry-driven',
  substitution: 'Substitution',
  'menu-change': 'Menu change',
  'waste-spoilage': 'Spoilage',
  'waste-overcook': 'Overcook',
  training: 'Training/staff',
  other: 'Other',
}

const NOISE_REASONS: Reason[] = ['waste-spoilage', 'training', 'expiry-driven']

interface ReconciliationConfirmCardProps {
  draft: Draft
}

export function ReconciliationConfirmCard({ draft }: ReconciliationConfirmCardProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const record = useRecordReconciliation()
  const [recorded, setRecorded] = useState(false)

  const ratio = draft.actualServings / draft.actualGuestCount
  const uplift = Math.round((ratio - 1) * 100)

  const handleConfirm = async () => {
    await record.mutateAsync({
      serviceDate: draft.serviceDate,
      mealType: draft.mealType,
      eventTag: draft.eventTag ?? null,
      actualGuestCount: draft.actualGuestCount,
      actualServings: draft.actualServings,
      notes: draft.notes ?? null,
      items: draft.items.map((i) => ({
        kitchenStockId: i.kitchenStockId,
        productId: i.productId,
        quantityUsed: i.quantityUsed,
        quantityWaste: i.quantityWaste,
        quantityLeftover: i.quantityLeftover,
        reason: i.reason,
        reasonNotes: i.reasonNotes ?? null,
      })),
    })
    setRecorded(true)
  }

  if (recorded) {
    return (
      <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-4 flex items-start gap-3">
        <Check className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">Reconciliation recorded</p>
          <p className="mt-0.5 text-xs text-emerald-800">
            {draft.items.length} item{draft.items.length === 1 ? '' : 's'} logged. The
            issuance agent will use this on the next planning run.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-card shadow-sm">
      {/* Header */}
      <div className="border-b bg-primary/5 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Reconciliation Draft
        </p>
        <p className="mt-0.5 text-sm font-medium">{draft.summary}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="capitalize">
            {draft.mealType}
          </Badge>
          {draft.eventTag && <Badge variant="outline">{draft.eventTag}</Badge>}
          <span>{draft.serviceDate}</span>
          <span>·</span>
          <span>
            {draft.actualGuestCount} guests · {draft.actualServings} servings
          </span>
          {uplift !== 0 && (
            <span className={uplift > 0 ? 'text-amber-700 font-medium' : 'text-muted-foreground'}>
              ({uplift > 0 ? `+${uplift}%` : `${uplift}%`} reorder)
            </span>
          )}
        </div>
      </div>

      {/* Optional notes block */}
      {draft.notes && (
        <>
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className="flex w-full items-center justify-between border-b px-4 py-2 text-xs hover:bg-muted/40"
          >
            <span className="font-medium">Chef's notes</span>
            {notesOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {notesOpen && (
            <p className="border-b px-4 py-3 text-xs whitespace-pre-wrap text-muted-foreground">
              {draft.notes}
            </p>
          )}
        </>
      )}

      {/* Items */}
      <div className="px-4 py-3 space-y-1.5">
        {draft.items.map((it, idx) => {
          const isNoise = NOISE_REASONS.includes(it.reason)
          return (
            <div key={`${it.kitchenStockId}-${idx}`} className="text-sm space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs w-20 shrink-0 tabular-nums">
                  {formatQuantity(it.quantityUsed)} {it.stockUnit}
                </span>
                <span className="flex-1 min-w-0 truncate">{it.productName}</span>
                <Badge
                  variant={isNoise ? 'outline' : 'secondary'}
                  className="text-[9px] h-4 px-1.5 shrink-0"
                >
                  {REASON_LABEL[it.reason]}
                </Badge>
              </div>
              {(it.quantityWaste || it.quantityLeftover || it.reasonNotes) && (
                <div className="ml-22 flex flex-wrap gap-3 text-[10px] text-muted-foreground pl-22">
                  {it.quantityWaste ? (
                    <span>waste {formatQuantity(it.quantityWaste)} {it.stockUnit}</span>
                  ) : null}
                  {it.quantityLeftover ? (
                    <span>left {formatQuantity(it.quantityLeftover)} {it.stockUnit}</span>
                  ) : null}
                  {it.reasonNotes && <span className="italic">"{it.reasonNotes}"</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirm */}
      <div className="border-t p-3">
        <Button
          className="w-full gap-2"
          size="sm"
          onClick={handleConfirm}
          disabled={record.isPending}
        >
          <Check className="h-3.5 w-3.5" />
          {record.isPending ? 'Recording…' : 'Record reconciliation'}
        </Button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Locks the reconciliation. You'll need to record a new one to change anything.
        </p>
      </div>
    </div>
  )
}
