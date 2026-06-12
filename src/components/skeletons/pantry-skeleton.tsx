import { PageHeader } from '@/components/ui/page-header'
import {
  LoadingStatus,
  SkeletonActions,
  SkeletonFilterRow,
  SkeletonStatCard,
  SkeletonTableCard,
} from './primitives'

/** Mirrors PantryPage: header + 4 stat cards + filter row + inventory table. */
export function PantrySkeleton() {
  return (
    <>
      <PageHeader
        title="Pantry Inventory"
        description="Current stock levels for essential supplies and raw materials."
        actions={<SkeletonActions widths={['w-28', 'w-32', 'w-56']} />}
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} accentBorder />
        ))}
      </div>
      <SkeletonFilterRow />
      <SkeletonTableCard rows={8} cols={6} />
      <LoadingStatus label="Loading inventory…" />
    </>
  )
}
