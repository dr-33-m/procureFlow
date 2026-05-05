import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, PackageCheck } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { useReceivingLists } from '@/hooks/use-receiving'
import { formatRelativeTime } from '@/lib/format'

export function ReceivingListPage() {
  const navigate = useNavigate()
  const { data: lists = [] } = useReceivingLists()

  const pending = lists.filter((l) => l.status === 'in_review')
  const completed = lists.filter((l) => l.status === 'completed')

  return (
    <AppLayout>
      <PageHeader
        title="Receiving & Staging"
        description="Review inbound deliveries and reconcile items against purchase orders."
        breadcrumb={[{ label: 'Operations' }, { label: 'Receiving' }]}
      />

      {pending.length === 0 ? (
        <EmptyState
          title="No pending deliveries"
          description="All deliveries have been verified. New items appear here when shopping lists are marked as fulfilled."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((list) => {
            const progressPct = list.itemCount
              ? Math.round((list.verifiedItems / list.itemCount) * 100)
              : 0

            return (
              <div
                key={list.id}
                className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={list.status} />
                  </div>

                  <p className="truncate text-base font-semibold">{list.name}</p>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {list.runnerName && (
                      <span>
                        Runner: <strong className="text-foreground">{list.runnerName}</strong>
                      </span>
                    )}
                    <span>In Review since {formatRelativeTime(list.updatedAt ?? list.createdAt)}</span>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>
                        {list.verifiedItems} / {list.itemCount} items scanned
                      </span>
                    </div>
                    <Progress value={progressPct} className="h-1.5" />
                  </div>
                </div>

                <Button
                  className="shrink-0 gap-2"
                  onClick={() => navigate({ to: '/receiving/$listId', params: { listId: list.id } })}
                >
                  Review
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recently Completed
          </h2>
          <div className="flex flex-col gap-2">
            {completed.slice(0, 5).map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between rounded-xl border bg-muted/30 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <PackageCheck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{list.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {list.itemCount} items · {formatRelativeTime(list.completedAt ?? list.updatedAt ?? list.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={list.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
