import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/components/features/settings/profile'

export const Route = createFileRoute('/settings/profile')({
  component: ProfilePage,
})
