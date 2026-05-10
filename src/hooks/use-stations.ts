import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStations, createStation, deleteStation } from '@/server/stations'
import { useBranchContext } from '@/stores/branch-context'

export const stationKeys = {
  all: ['stations'] as const,
  list: (branchId: string) => [...stationKeys.all, branchId] as const,
}

export function useStations() {
  const branchId = useBranchContext((s) => s.activeBranchId)
  return useQuery({
    queryKey: stationKeys.list(branchId),
    queryFn: () => getStations({ data: branchId }),
    enabled: !!branchId,
  })
}

export function useCreateStation() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (name: string) => createStation({ data: { branchId, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.all })
      toast.success('Station created')
    },
    onError: () => {
      toast.error('Failed to create station')
    },
  })
}

export function useDeleteStation() {
  const queryClient = useQueryClient()
  const branchId = useBranchContext((s) => s.activeBranchId)

  return useMutation({
    mutationFn: (id: string) => deleteStation({ data: { id, branchId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.all })
      toast.success('Station removed')
    },
    onError: () => {
      toast.error('Failed to remove station')
    },
  })
}
