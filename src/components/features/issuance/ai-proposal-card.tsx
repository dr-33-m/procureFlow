import { useState } from 'react'
import { Send, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePantryCatalog } from '@/hooks/use-pantry'
import { useIssuanceCart, type LineBasis } from '@/stores/issuance-cart'
import { formatQuantity } from '@/lib/format'

type ProposalItem = {
  productId: string
  productName: string
  quantityStock: number
  stockUnit: string
  basis: LineBasis
  lineReasoning?: string
}

type Proposal = {
  summary: string
  reasoning: string
  expectedGuestCount: number
  expectedServings?: number
  menuId?: string
  eventTag?: string
  items: ProposalItem[]
}

const BASIS_LABEL: Record<LineBasis, string> = {
  'learned-rate': 'Learned rate',
  'menu-recipe': 'Menu recipe',
  'expiry-driven': 'Expiry-driven',
  'manual-override': 'Manual override',
  'fallback-static-par': 'Static par (fallback)',
}

const BASIS_VARIANT: Record<LineBasis, 'default' | 'secondary' | 'outline'> = {
  'learned-rate': 'default',
  'menu-recipe': 'secondary',
  'expiry-driven': 'outline',
  'manual-override': 'outline',
  'fallback-static-par': 'outline',
}

interface AIProposalCardProps {
  proposal: Proposal
}

export function AIProposalCard({ proposal }: AIProposalCardProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const [perLineOpen, setPerLineOpen] = useState(false)

  const { data: catalog = [] } = usePantryCatalog()
  const applyAIProposal = useIssuanceCart((s) => s.applyAIProposal)

  const catalogById = new Map(catalog.map((p) => [p.id, p]))

  // Filter out items we can't map back to the catalog (deleted products etc.)
  const resolvedItems = proposal.items
    .map((it) => {
      const cat = catalogById.get(it.productId)
      return cat
        ? {
            ...it,
            catalogStockUnit: cat.stockUnit,
            purchaseUnit: cat.purchaseUnit,
            purchasePackSize: cat.purchasePackSize,
          }
        : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const unresolvedCount = proposal.items.length - resolvedItems.length

  const handleApply = () => {
    applyAIProposal({
      items: resolvedItems.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        stockUnit: it.catalogStockUnit ?? it.stockUnit,
        purchaseUnit: it.purchaseUnit ?? null,
        purchasePackSize: it.purchasePackSize ?? null,
        quantityStock: it.quantityStock,
        basis: it.basis,
        lineReasoning: it.lineReasoning,
      })),
      guestCount: proposal.expectedGuestCount,
      expectedServings: proposal.expectedServings,
      summary: proposal.summary,
      reasoning: proposal.reasoning,
      menuId: proposal.menuId,
      eventTag: proposal.eventTag,
    })
  }

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-card shadow-sm">
      <div className="border-b bg-primary/5 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              AI Proposal
            </p>
            <p className="mt-0.5 text-sm font-medium">{proposal.summary}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{proposal.expectedGuestCount} guests</span>
              {proposal.expectedServings &&
                proposal.expectedServings !== proposal.expectedGuestCount && (
                  <>
                    <span>·</span>
                    <span>{proposal.expectedServings} servings expected</span>
                  </>
                )}
              {proposal.eventTag && (
                <>
                  <span>·</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {proposal.eventTag}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reasoning (collapsible) */}
      <button
        type="button"
        onClick={() => setReasoningOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b px-4 py-2 text-xs hover:bg-muted/40"
      >
        <span className="font-medium">Why these quantities</span>
        {reasoningOpen ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {reasoningOpen && (
        <div className="border-b px-4 py-3 text-xs whitespace-pre-wrap text-muted-foreground">
          {proposal.reasoning || '(no reasoning provided)'}
        </div>
      )}

      {/* Items */}
      <div className="px-4 py-3">
        <div className="space-y-1.5">
          {resolvedItems.slice(0, perLineOpen ? undefined : 6).map((it) => (
            <div key={it.productId} className="flex items-baseline gap-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground w-20 shrink-0 tabular-nums">
                {formatQuantity(it.quantityStock)} {it.stockUnit}
              </span>
              <span className="flex-1 min-w-0 truncate">{it.productName}</span>
              <Badge variant={BASIS_VARIANT[it.basis]} className="text-[9px] h-4 px-1.5 shrink-0">
                {BASIS_LABEL[it.basis]}
              </Badge>
            </div>
          ))}
        </div>

        {resolvedItems.length > 6 && (
          <button
            type="button"
            onClick={() => setPerLineOpen((o) => !o)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {perLineOpen ? 'Show fewer' : `Show all ${resolvedItems.length} lines`}
          </button>
        )}
      </div>

      {unresolvedCount > 0 && (
        <div className="border-t bg-amber-50/40 px-4 py-2 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            {unresolvedCount} item{unresolvedCount === 1 ? '' : 's'} couldn't be matched to
            your current pantry and will be skipped.
          </p>
        </div>
      )}

      <div className="border-t p-3">
        <Button
          className="w-full gap-2"
          size="sm"
          onClick={handleApply}
          disabled={resolvedItems.length === 0}
        >
          <Send className="h-3.5 w-3.5" />
          Send to deduction cart
        </Button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          You can still edit quantities, units, and lines before issuing.
        </p>
      </div>
    </div>
  )
}
