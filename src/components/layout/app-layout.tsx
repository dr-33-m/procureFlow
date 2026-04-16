import { Sidebar } from './sidebar'
import { Header } from './header'
import { MOCK_USER_NAME, MOCK_USER_ROLE } from '@/lib/mock-context'

interface AppLayoutProps {
  children: React.ReactNode
  headerPlaceholder?: string
}

export function AppLayout({ children, headerPlaceholder }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          userName={MOCK_USER_NAME}
          userRole={MOCK_USER_ROLE}
          placeholder={headerPlaceholder}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
