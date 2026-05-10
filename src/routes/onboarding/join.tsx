import { createFileRoute } from '@tanstack/react-router'
import { JoinPage } from '@/components/features/onboarding/join-page'

export const Route = createFileRoute('/onboarding/join')({
  component: JoinPage,
})
