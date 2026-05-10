import { createFileRoute } from '@tanstack/react-router'
import { CreateCompanyPage } from '@/components/features/onboarding/create-company-page'

export const Route = createFileRoute('/onboarding/create-company')({
  component: CreateCompanyPage,
})
