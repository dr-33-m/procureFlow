import { useAuth } from './use-auth'
import type { UserRole } from '@/types'

export function usePermissions() {
  const auth = useAuth()
  const role = auth?.userRole ?? null

  const hasRole = (...roles: UserRole[]) => role !== null && roles.includes(role)

  return {
    role,
    // Navigation visibility
    canViewDashboard: hasRole('owner', 'admin'),
    canViewPantry: hasRole('owner', 'admin', 'chef'),
    canViewIssuance: hasRole('owner', 'admin', 'chef'),
    canViewReceiving: hasRole('owner', 'admin'),
    canViewMembers: hasRole('owner', 'admin'),
    canSwitchBranch: hasRole('owner', 'admin'),

    // Actions
    canCreateShoppingList: hasRole('owner', 'admin', 'chef'),
    canEditShoppingList: hasRole('owner', 'admin', 'chef'),
    canDeleteShoppingList: hasRole('owner', 'admin'),
    canApproveReceiving: hasRole('owner', 'admin'),
    canIssueStock: hasRole('owner', 'admin'),
    canEditInventory: hasRole('owner', 'admin'),
    canManageStations: hasRole('owner', 'admin'),
    canManageMembers: hasRole('owner', 'admin'),
    canInviteAdmin: hasRole('owner'),
  }
}
