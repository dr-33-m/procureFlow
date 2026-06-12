import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'

interface PendingPageProps {
  title: string
  description?: React.ReactNode
  /** Roughly match the real page's layout so the swap is less jarring. */
  variant?: 'table' | 'cards' | 'settings-form' | 'profile'
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
      ) : variant === 'settings-form' ? (
        <>
          <div className="flex gap-1 border-b">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
          <div className="rounded-lg border p-6 space-y-5 max-w-xl">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end pt-2">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </>
      ) : variant === 'profile' ? (
        <div className="rounded-lg border bg-card">
          <div className="px-6 py-6 flex items-center gap-6">
            <Skeleton className="h-16 w-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t space-y-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
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
