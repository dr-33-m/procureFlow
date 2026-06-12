import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'

interface PendingPageProps {
  title: string
  description?: React.ReactNode
  /** Roughly match the real page's layout so the swap is less jarring. */
  variant?: 'table' | 'cards'
}

/**
 * The shell a route shows the instant it's navigated to (via `pendingComponent`
 * + `defaultPendingMs: 0`), while its loader prefetches data. Rendered inside
 * the `_app` Outlet, so the sidebar/header stay mounted — only the page body
 * swaps to this skeleton.
 */
export function PendingPage({
  title,
  description,
  variant = 'table',
}: PendingPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      {variant === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
    </>
  )
}
