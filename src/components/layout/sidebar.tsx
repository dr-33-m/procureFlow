import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  PackagePlus,
  HelpCircle,
  LogOut,
  Plus,
  ChevronsUpDown,
  Building2,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import logoSvg from '@/assets/procureFlow.svg'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useProfile } from '@/hooks/use-profile'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/types'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['owner', 'admin'] },
  { label: 'Shopping Lists', href: '/shopping-lists', icon: ShoppingCart },
  { label: 'Receiving', href: '/receiving', icon: ClipboardList, roles: ['owner', 'admin'] },
  { label: 'Pantry', href: '/pantry', icon: Package, roles: ['owner', 'admin', 'chef'] },
  { label: 'Issuance', href: '/issuance', icon: PackagePlus, roles: ['owner', 'admin', 'chef'] },
]

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  chef: 'Chef',
  runner: 'Runner',
}


export function AppSidebar() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const auth = useAuth()
  const { canCreateShoppingList } = usePermissions()

  const role = auth?.userRole ?? null

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return role !== null && item.roles.includes(role)
  })

  const filteredItems = visibleNavItems

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const userName = auth?.userName ?? 'User'
  const userRole = auth?.userRole
  const userInitials = getInitials(userName)
  const roleLabel = userRole ? ROLE_LABELS[userRole] : ''
  const avatarSrc = profile?.avatar ?? undefined
  const canAccessCompany = role === 'owner' || role === 'admin'

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader>
        <div className="flex h-14 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary p-1.5">
            <img src={logoSvg} alt="ProcureFlow" className="h-full w-full invert" />
          </div>
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold leading-tight">ProcureFlow</p>
            <p className="truncate text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Management Portal
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-2 group-data-[collapsible=icon]:px-0">
            <SidebarMenu>
              {filteredItems.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    className="group-data-[collapsible=icon]:mx-auto"
                  >
                    <Link to={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New Order CTA — hidden for runners */}
        {canCreateShoppingList && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <div className="px-1 group-data-[collapsible=icon]:px-0">
                <Link to="/shopping-lists/create">
                  <Button
                    className="w-full gap-2 group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">New Order</span>
                  </Button>
                </Link>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer — user dropdown */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip={userName}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {avatarSrc && <AvatarImage src={avatarSrc} alt={userName} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-sm">{userName}</p>
                    <p className="text-xs text-muted-foreground">{auth?.userEmail}</p>
                    <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => navigate({ to: '/settings/profile' })}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Profile settings
                </DropdownMenuItem>
                {canAccessCompany && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => navigate({ to: '/settings/company', search: { tab: 'general' } })}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Company settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onSelect={() => { window.location.href = '/auth/sign-out' }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
