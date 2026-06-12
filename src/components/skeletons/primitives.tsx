import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Building blocks for per-page loading skeletons. Each primitive mirrors the
 * container classes of the real component it stands in for (StatCard,
 * DataTable card, filter toolbar) so the swap to live content causes no
 * layout shift.
 */

/** Subtle pulsing status line shown at the bottom of every page skeleton. */
export function LoadingStatus({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="mt-6 animate-pulse text-center text-sm text-muted-foreground"
    >
      {label}
    </p>
  )
}

/** Mirrors StatCard: rounded-xl border bg-card p-5 shadow-sm. */
export function SkeletonStatCard({ accentBorder }: { accentBorder?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm',
        accentBorder && 'border-l-4 border-l-muted',
      )}
    >
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="h-9 w-20" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  )
}

/** Mirrors a row of action buttons (PageHeader actions slot). */
export function SkeletonActions({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {widths.map((w, i) => (
        <Skeleton key={i} className={cn('h-9', w)} />
      ))}
    </div>
  )
}

/** Mirrors the search + selects toolbar rendered above tables. */
export function SkeletonFilterRow() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-9 w-36" />
    </div>
  )
}

/** Mirrors DataTable's header + rows (matches its built-in loading branch). */
export function SkeletonTable({
  rows = 8,
  cols = 5,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b last:border-0">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Skeleton className="h-4 w-full max-w-40" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** SkeletonTable inside the standard rounded-card table container. */
export function SkeletonTableCard({
  rows,
  cols,
  className,
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border bg-card shadow-sm', className)}>
      <SkeletonTable rows={rows} cols={cols} />
    </div>
  )
}
