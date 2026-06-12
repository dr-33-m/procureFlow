import { getUserProfile } from '@/server/profile'
import { profileKeys } from './keys'

export function getProfileOptions() {
  return {
    queryKey: profileKeys.logto(),
    queryFn: () => getUserProfile(),
    // Logto profile changes only through our own mutations (which invalidate
    // this key), so cache generously — each refetch is a cross-server call.
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
  }
}
