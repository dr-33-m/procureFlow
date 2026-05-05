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
  ChevronsUpDown,
  User,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Shopping Lists', href: '/shopping-lists', icon: ShoppingCart },
  { label: 'Receiving', href: '/receiving', icon: ClipboardList },
  { label: 'Pantry', href: '/pantry', icon: Package },
  { label: 'Issuance', href: '/issuance', icon: PackagePlus },
]

const USER_NAME = 'Marcus Vane'
const USER_ROLE = 'Operations Manager'
const USER_INITIALS = 'MV'

export function AppSidebar() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon">
      {/* Logo + Location selector */}
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
              {navItems.map(({ label, href, icon: Icon }) => (
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

        {/* New Order CTA */}
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
                  tooltip={USER_NAME}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {USER_INITIALS}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{USER_NAME}</span>
                    <span className="truncate text-xs text-muted-foreground">{USER_ROLE}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-sm">{USER_NAME}</p>
                    <p className="text-xs text-muted-foreground">{USER_ROLE}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600">
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
