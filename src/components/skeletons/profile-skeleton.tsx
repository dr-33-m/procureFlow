import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingStatus } from './primitives'

/**
 * Mirrors ProfilePage: identity section (avatar + name/username fields),
 * contact section (email + password fields), then the role + save footer.
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Manage your personal details." />

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-6 px-6 py-6">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
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

        <div className="space-y-3 border-t px-6 py-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <LoadingStatus label="Loading profile…" />
    </div>
  )
}
