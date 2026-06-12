import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/components/features/settings/profile'
import { ProfileSkeleton } from '@/components/skeletons/profile-skeleton'
import { getProfileOptions } from '@/lib/query-manager/profile/options'

export const Route = createFileRoute('/_app/settings/profile')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(getProfileOptions())
  },
  component: ProfilePage,
  pendingComponent: ProfileSkeleton,
})
