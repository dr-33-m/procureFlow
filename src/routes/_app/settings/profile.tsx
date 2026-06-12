import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/components/features/settings/profile'

export const Route = createFileRoute('/_app/settings/profile')({
  component: ProfilePage,
})
