import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusValue =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'found'
  | 'not_found'
  | 'partial'
  | 'unverified'
  | 'verified'
  | 'matched'
  | 'shortage'
  | 'urgent'
  | 'normal'
  | string

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  in_stock: {
    label: 'In Stock',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  low_stock: {
    label: 'Low Stock',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  out_of_stock: {
    label: 'Out of Stock',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-border',
  },
  pending: {
    label: 'Pending',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  shopping: {
    label: 'Shopping',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  in_review: {
    label: 'In Review',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  on_hold: {
    label: 'On Hold',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  in_progress: {
    label: 'In Review',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  found: {
    label: 'Found',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  not_found: {
    label: 'Not Found',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  unverified: {
    label: 'Received (Unverified)',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  verified: {
    label: 'Verified',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  matched: {
    label: 'Matched',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  shortage: {
    label: 'Shortage',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  surplus: {
    label: 'Surplus',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  normal: {
    label: 'Normal',
    className: 'bg-muted text-muted-foreground border-border',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
}

interface StatusBadgeProps {
  status: StatusValue
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <Badge
      variant="outline"
      className={cn('font-medium capitalize', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
