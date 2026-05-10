export const companyKeys = {
  all: ['company'] as const,
  company: () => [...companyKeys.all, 'detail'] as const,
  branches: () => [...companyKeys.all, 'branches'] as const,
  tierUsage: () => [...companyKeys.all, 'tier-usage'] as const,
  members: () => [...companyKeys.all, 'members'] as const,
  pendingInvites: () => [...companyKeys.all, 'pending-invites'] as const,
}
