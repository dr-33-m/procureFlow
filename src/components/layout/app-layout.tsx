import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { AppSidebar } from './sidebar'
import { Header } from './header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useBranchContext } from '@/stores/branch-context'
import { getCompanyBranchesOptions } from '@/lib/query-manager/company/options'
import { useAuth } from '@/hooks/use-auth'

interface AppLayoutProps {
  children: React.ReactNode
}

function RunnerNavGuard() {
  const auth = useAuth()

  useBlocker({
    shouldBlockFn: ({ next }) => {
      if (auth?.userRole !== 'runner') return false
      const { pathname } = next
      return (
        !pathname.startsWith('/shopping-lists') &&
        !pathname.startsWith('/settings/profile')
      )
    },
    enableBeforeUnload: false,
  })

  return null
}

function BranchContextInitializer() {
  const auth = useAuth()
  const setBranches = useBranchContext((s) => s.setBranches)
  const activeBranchId = useBranchContext((s) => s.activeBranchId)
  const setActiveBranch = useBranchContext((s) => s.setActiveBranch)

  const canSwitchBranch = auth?.userRole === 'owner' || auth?.userRole === 'admin'

  // Fetch all company branches for all roles (used to get branch names)
  const { data: allBranches } = useQuery({
    ...getCompanyBranchesOptions(),
    enabled: !!auth,
  })

  useEffect(() => {
    if (!auth || !allBranches) return

    if (canSwitchBranch) {
      // Owner/admin sees all branches
      const options = allBranches.map((b) => ({ id: b.id, name: b.name }))
      setBranches(options)
      if (!activeBranchId && auth.defaultBranchId) {
        setActiveBranch(auth.defaultBranchId)
      }
    } else {
      // Chef/runner: only their assigned branch
      const theirBranch = allBranches.find((b) => b.id === auth.defaultBranchId)
      if (theirBranch) {
        setBranches([{ id: theirBranch.id, name: theirBranch.name }])
        setActiveBranch(theirBranch.id)
      }
    }
  }, [auth, allBranches, canSwitchBranch, activeBranchId, setBranches, setActiveBranch])

  return null
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <RunnerNavGuard />
        <BranchContextInitializer />
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
