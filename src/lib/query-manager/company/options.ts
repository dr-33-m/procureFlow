import { getCompany, getCompanyBranches, getTierUsage } from '@/server/company'
import { getMembers, getPendingInvites } from '@/server/members'
import { companyKeys } from './keys'

export function getCompanyOptions() {
  return {
    queryKey: companyKeys.company(),
    queryFn: () => getCompany(),
    staleTime: 5 * 60_000,
  }
}

export function getCompanyBranchesOptions() {
  return {
    queryKey: companyKeys.branches(),
    queryFn: () => getCompanyBranches(),
    staleTime: 5 * 60_000,
  }
}

export function getTierUsageOptions() {
  return {
    queryKey: companyKeys.tierUsage(),
    queryFn: () => getTierUsage(),
    staleTime: 60_000,
  }
}

export function getMembersOptions() {
  return {
    queryKey: companyKeys.members(),
    queryFn: () => getMembers(),
    staleTime: 60_000,
  }
}

export function getPendingInvitesOptions() {
  return {
    queryKey: companyKeys.pendingInvites(),
    queryFn: () => getPendingInvites(),
    staleTime: 60_000,
  }
}
