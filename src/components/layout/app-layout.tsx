import { useBlocker } from '@tanstack/react-router'
import { AppSidebar } from './sidebar'
import { Header } from './header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
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

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <RunnerNavGuard />
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
