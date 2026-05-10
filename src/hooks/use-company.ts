import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCompanyOptions,
  getCompanyBranchesOptions,
  getTierUsageOptions,
  getMembersOptions,
  getPendingInvitesOptions,
} from '@/lib/query-manager/company/options'
import { companyKeys } from '@/lib/query-manager/company/keys'
import { updateCompany, createBranch, updateBranch } from '@/server/company'
import { removeMember } from '@/server/members'

export function useCompany() {
  return useQuery(getCompanyOptions())
}

export function useCompanyBranches() {
  return useQuery(getCompanyBranchesOptions())
}

export function useTierUsage() {
  return useQuery(getTierUsageOptions())
}

export function useMembers() {
  return useQuery(getMembersOptions())
}

export function usePendingInvites() {
  return useQuery(getPendingInvitesOptions())
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; bio?: string }) => updateCompany({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.company() })
      toast.success('Company updated')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update company')
    },
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; name: string }) => updateBranch({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.branches() })
      toast.success('Branch renamed')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to rename branch')
    },
  })
}

export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => createBranch({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.branches() })
      queryClient.invalidateQueries({ queryKey: companyKeys.tierUsage() })
      toast.success('Branch created')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create branch')
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { memberId: string; level: 'company' | 'branch' }) =>
      removeMember({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.members() })
      toast.success('Member removed')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    },
  })
}
