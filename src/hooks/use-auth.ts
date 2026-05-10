import { useMatch } from '@tanstack/react-router'
import type { AppSessionData } from '@/server/auth/session'

export type AuthState = (AppSessionData & { authenticated: true; needsOnboarding: false }) | null

export function useAuth(): AuthState {
  const context = useMatch({ from: '__root__', select: (m) => m.context })
  return (context as { auth: AuthState }).auth
}
