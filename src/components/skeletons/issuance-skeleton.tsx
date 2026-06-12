import { Skeleton } from '@/components/ui/skeleton'
import {
  LoadingStatus,
  SkeletonActions,
  SkeletonFilterRow,
  SkeletonTableCard,
} from './primitives'

/**
 * Mirrors IssuancePage: custom header + today's-issuance card beside the
 * recent-issuances card, then filters and the issuance table.
 */
export function IssuanceSkeleton() {
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Inventory Management
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Stock Issuance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record stock departures from the central pantry for kitchen operations.
          </p>
        </div>
        <SkeletonActions widths={['w-36', 'w-36']} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="col-span-1 rounded-xl border bg-card p-5 shadow-sm">
          <Skeleton className="mb-2 h-3 w-40" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="mt-2 h-4 w-28" />
          <Skeleton className="mt-3 h-4 w-32" />
        </div>
        <div className="col-span-1 rounded-xl border bg-card p-4 shadow-sm sm:col-span-2">
          <Skeleton className="mb-3 h-3 w-32" />
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <Skeleton className="mb-1.5 h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <SkeletonFilterRow />
      <SkeletonTableCard rows={8} cols={5} />
      <LoadingStatus label="Loading issuance data…" />
    </>
  )
}
