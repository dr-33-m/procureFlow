import { getUserProfile } from '@/server/profile'
import { profileKeys } from './keys'

export function getProfileOptions() {
  return {
    queryKey: profileKeys.logto(),
    queryFn: () => getUserProfile(),
    staleTime: 5 * 60_000,
  }
}
