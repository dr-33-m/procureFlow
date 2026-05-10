import { useSession } from '@tanstack/react-start/server'
import type { UserRole } from '@/types'

export type AppSessionData = {
  userId: string
  userName: string
  userEmail: string
  userRole: UserRole
  companyId: string
  defaultBranchId: string
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function getAppSession() {
  return useSession<AppSessionData>({
    password: process.env.SESSION_SECRET!,
    name: 'procureflow',
    maxAge: 60 * 60 * 24 * 7,
    cookie: COOKIE_OPTIONS,
  })
}

export async function useLogtoSession() {
  return useSession<Record<string, string>>({
    password: process.env.SESSION_SECRET!,
    name: 'procureflow-logto',
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    },
  })
}
