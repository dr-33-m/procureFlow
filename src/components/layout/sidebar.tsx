import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  PackagePlus,
  HelpCircle,
  LogOut,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import logoSvg from '@/assets/procureFlow.svg'

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Shopping Lists', href: '/shopping-lists', icon: ShoppingCart },
  { label: 'Receiving', href: '/receiving', icon: ClipboardList },
  { label: 'Pantry', href: '/pantry', icon: Package },
  { label: 'Issuance', href: '/issuance', icon: PackagePlus },
]

export function Sidebar() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary p-1.5">
          <img src={logoSvg} alt="ProcureFlow" className="h-full w-full invert" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">ProcureFlow</p>
          <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Management Portal
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* New Order CTA */}
      <div className="px-3 pb-3">
        <Link to="/shopping-lists/create">
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Bottom links */}
      <div className="space-y-0.5 border-t px-3 py-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <HelpCircle className="h-4 w-4" />
          Help
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
