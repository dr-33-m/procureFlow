export const TIER_LIMITS = {
  starter: { branches: 2, users: 10, stations: 6, products: 800 },
  growth: { branches: 5, users: 25, stations: 12, products: 2000 },
  pro: { branches: 15, users: 75, stations: 30, products: 10000 },
} as const

export type Tier = keyof typeof TIER_LIMITS
export type TierResource = keyof (typeof TIER_LIMITS)['starter']

export function getTierLimits(tier: string) {
  return TIER_LIMITS[tier as Tier] ?? TIER_LIMITS.starter
}
