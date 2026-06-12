import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LoadingStatus,
  SkeletonActions,
  SkeletonStatCard,
  SkeletonTableCard,
} from './primitives'

/** Mirrors KitchenPage: header + 3 stat cards + view toggle + stock table. */
export function KitchenSkeleton() {
  return (
    <>
      <PageHeader
        title="Kitchen"
        description="Items issued to the kitchen, waiting for the chef to close out at end of day."
        actions={<SkeletonActions widths={['w-40']} />}
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="mb-4 inline-flex rounded-md border bg-card p-0.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="ml-0.5 h-8 w-28" />
      </div>
      <SkeletonTableCard rows={8} cols={5} />
      <LoadingStatus label="Loading kitchen stock…" />
    </>
  )
}
