import { Skeleton } from '@/components/ui/skeleton'
import { LoadingStatus, SkeletonTable } from './primitives'

/**
 * Mirrors DashboardPage: title + 3-card overview grid + quick-actions bar +
 * recent-activity table card.
 */
export function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Operational Dashboard
          </h1>
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
      </div>

      {/* Top row: pantry overview / critical warnings / active lists */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Skeleton className="mb-2 h-3 w-20" />
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="mb-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-1.5 h-3 w-16" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="my-2 h-10 w-16" />
          <Skeleton className="mb-4 h-4 w-48" />
          <Skeleton className="h-9 w-full" />
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-16" />
          <Skeleton className="mt-2 h-4 w-36" />
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-4 rounded-xl border bg-muted/50 p-0.5">
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <SkeletonTable rows={4} cols={3} />
      </div>

      <LoadingStatus label="Loading dashboard…" />
    </>
  )
}
