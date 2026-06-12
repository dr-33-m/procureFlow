import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingStatus, SkeletonActions } from './primitives'

/** Mirrors MenusPage: header + meal-type section heading + menu card grid. */
export function MenusSkeleton() {
  return (
    <>
      <PageHeader
        title="Menus"
        description="Recipes the AI uses as the starting point for issuance and demand forecasting."
        actions={<SkeletonActions widths={['w-28', 'w-40']} />}
      />
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-5 w-16 rounded-full" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      </section>
      <LoadingStatus label="Loading menus…" />
    </>
  )
}
