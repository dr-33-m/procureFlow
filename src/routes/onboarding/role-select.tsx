import { createFileRoute } from '@tanstack/react-router'
import { RoleSelectPage } from '@/components/features/onboarding/role-select-page'

export const Route = createFileRoute('/onboarding/role-select')({
  component: RoleSelectPage,
})
