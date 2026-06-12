import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingStatus } from './primitives'

function DeliveryCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mb-3 h-3 w-64" />
        <div className="max-w-md">
          <div className="mb-1 flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
      <Skeleton className="h-9 w-36 shrink-0" />
    </div>
  )
}

/** Mirrors ReceivingListPage: header + section heading + delivery cards. */
export function ReceivingSkeleton() {
  return (
    <>
      <PageHeader
        title="Receiving & Staging"
        description="Review inbound deliveries and reconcile items against purchase orders."
      />
      <Skeleton className="mb-3 h-4 w-44" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DeliveryCardSkeleton key={i} />
        ))}
      </div>
      <LoadingStatus label="Loading deliveries…" />
    </>
  )
}
