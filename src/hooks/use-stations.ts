import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStations, createStation, deleteStation } from '@/server/stations'

export const stationKeys = {
  all: ['stations'] as const,
}

export function useStations() {
  return useQuery({
    queryKey: stationKeys.all,
    queryFn: () => getStations(),
  })
}

export function useCreateStation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createStation({ data: { name } }),
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

  return useMutation({
    mutationFn: (id: string) => deleteStation({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKeys.all })
      toast.success('Station removed')
    },
    onError: () => {
      toast.error('Failed to remove station')
    },
  })
}
