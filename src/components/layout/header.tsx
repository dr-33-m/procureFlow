import { Bell, MapPin, ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function Header() {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      {/* Mobile sidebar trigger */}
      <SidebarTrigger className="-ml-1" />

      <div className="h-5 w-px bg-border" />

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Bell className="h-4.5 w-4.5" />
          </button>
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
        </div>

        {/* Location selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">Main Kitchen</span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Location
            </DropdownMenuLabel>
            <DropdownMenuItem>
              <MapPin className="mr-2 h-4 w-4" />
              Main Kitchen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
