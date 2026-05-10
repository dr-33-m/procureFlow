import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TierUsageBar } from '@/components/ui/tier-usage-bar'
import { useTierUsage } from '@/hooks/use-company'

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}

export function PlanTab() {
  const { data: usage } = useTierUsage()
  const tier = usage?.tier ?? 'starter'

  return (
    <div className="space-y-6 max-w-xl">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your active subscription tier.
            </p>
          </div>
          <Badge variant="outline" className="capitalize text-sm px-3 py-1">
            {TIER_LABELS[tier] ?? tier}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <p className="text-sm font-medium">Usage</p>
        <div className="grid grid-cols-2 gap-6">
          <TierUsageBar resource="users" label="Team members" />
          <TierUsageBar resource="branches" label="Branches" />
          <TierUsageBar resource="stations" label="Stations" />
          <TierUsageBar resource="products" label="Products" />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-3">
        <p className="text-sm font-medium">Upgrade plan</p>
        <p className="text-sm text-muted-foreground">
          Need more capacity? Get in touch to upgrade your plan.
        </p>
        <Button variant="outline" disabled>
          Contact sales
        </Button>
      </div>
    </div>
  )
}
