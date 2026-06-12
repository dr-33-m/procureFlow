import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingStatus } from './primitives'

/** Mirrors CompanySettingsPage: tab bar + the general-tab form card. */
export function CompanySettingsSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company"
        description="Manage your company settings, plan, branches, and team."
      />

      <div className="flex gap-1 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-7 w-24" />
        ))}
      </div>

      <div className="max-w-xl space-y-5 rounded-lg border p-6">
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

      <LoadingStatus label="Loading company settings…" />
    </div>
  )
}
