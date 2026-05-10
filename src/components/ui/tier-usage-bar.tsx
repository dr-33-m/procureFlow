import { useQuery } from '@tanstack/react-query'
import { getTierUsageOptions } from '@/lib/query-manager/company/options'
import { Progress } from './progress'

interface TierUsageBarProps {
  resource: 'branches' | 'users' | 'stations' | 'products'
  label?: string
  className?: string
}

export function TierUsageBar({ resource, label, className }: TierUsageBarProps) {
  const { data } = useQuery(getTierUsageOptions())

  if (!data) return null

  const current = data.usage[resource]
  const max = data.limits[resource]
  const pct = max > 0 ? Math.round((current / max) * 100) : 0
  const atLimit = current >= max
  const nearLimit = pct >= 80

  const displayLabel = label ?? resource.charAt(0).toUpperCase() + resource.slice(1)

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{displayLabel}</span>
        <span className={`text-xs font-medium ${atLimit ? 'text-destructive' : nearLimit ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {current} / {max}
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-1.5 ${atLimit ? '[&>[data-slot=indicator]]:bg-destructive' : nearLimit ? '[&>[data-slot=indicator]]:bg-amber-500' : ''}`}
      />
      {atLimit && (
        <p className="mt-1 text-[11px] text-destructive">
          Limit reached — upgrade to add more.
        </p>
      )}
    </div>
  )
}
