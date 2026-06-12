import { PageHeader } from '@/components/ui/page-header'
import { LoadingStatus, SkeletonTableCard } from './primitives'

/**
 * Generic skeleton for detail/list pages whose body is a single table card.
 * Pages with richer layouts (stats, filters, tabs) get a dedicated skeleton.
 */
export function TablePageSkeleton({
  title,
  description,
  label = 'Loading…',
  rows = 8,
  cols = 5,
}: {
  title: string
  description?: string
  label?: string
  rows?: number
  cols?: number
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <SkeletonTableCard rows={rows} cols={cols} />
      <LoadingStatus label={label} />
    </>
  )
}
