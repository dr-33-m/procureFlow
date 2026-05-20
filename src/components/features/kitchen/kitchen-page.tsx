import { useState } from 'react'
import { Sparkles, History, Clock } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { KitchenStockTable } from './kitchen-stock-table'
import { AIKitchenDrawer } from './ai-kitchen-drawer'
import { ReconciliationHistory } from './reconciliation-history'
import { useKitchenStock, useReconciliationHistory } from '@/hooks/use-kitchen'
import { usePermissions } from '@/hooks/use-permissions'

export function KitchenPage() {
  const [aiOpen, setAIOpen] = useState(false)
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  const { data: pendingStock = [], isLoading: pendingLoading } = useKitchenStock({
    status: 'pending',
  })
  const { data: partialStock = [] } = useKitchenStock({ status: 'partial' })
  const { data: history = [] } = useReconciliationHistory()
  const { canReconcileKitchen } = usePermissions()

  const allOpen = [...pendingStock, ...partialStock]
  const distinctServices = new Set(
    allOpen.map((r) => `${r.menuId ?? 'none'}|${r.eventTag ?? ''}`),
  ).size

  return (
    <AppLayout>
      <>
        <PageHeader
          title="Kitchen"
          description="Items issued to the kitchen, waiting for the chef to close out at end of day."
          actions={
            canReconcileKitchen ? (
              <Button className="gap-2" onClick={() => setAIOpen(true)}>
                <Sparkles className="h-4 w-4" />
                Reconcile with AI
              </Button>
            ) : undefined
          }
        />

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Open items"
            value={allOpen.length}
            subValue={`${distinctServices} service${distinctServices === 1 ? '' : 's'}`}
            accentBorder
            variant="default"
          />
          <StatCard
            label="Partial"
            value={partialStock.length}
            subValue="Awaiting completion"
            subValueVariant={partialStock.length > 0 ? 'warning' : undefined}
            accentBorder
            variant={partialStock.length > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Reconciled this week"
            value={history.length}
            subValue="Most recent runs"
            accentBorder
            variant="default"
          />
        </div>

        {/* Tab toggle */}
        <div className="mb-4 inline-flex rounded-md border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'pending'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Open ({allOpen.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === 'history'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History ({history.length})
          </button>
        </div>

        {tab === 'pending' ? (
          <KitchenStockTable
            rows={allOpen}
            emptyMessage={
              pendingLoading
                ? 'Loading…'
                : 'Nothing to reconcile. Once issuance happens, items land here.'
            }
          />
        ) : (
          <ReconciliationHistory rows={history} />
        )}

        <AIKitchenDrawer open={aiOpen} onOpenChange={setAIOpen} />
      </>
    </AppLayout>
  )
}
