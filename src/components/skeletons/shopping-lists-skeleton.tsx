import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LoadingStatus,
  SkeletonActions,
  SkeletonTableCard,
} from './primitives'

/** Mirrors ShoppingListsPage: header + filter-tab pills + table card. */
export function ShoppingListsSkeleton() {
  return (
    <>
      <PageHeader
        title="Shopping Lists"
        actions={<SkeletonActions widths={['w-32', 'w-36']} />}
      />
      <div className="mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <SkeletonTableCard rows={8} cols={5} />
      <LoadingStatus label="Loading shopping lists…" />
    </>
  )
}
