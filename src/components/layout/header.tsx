import { Bell, Settings, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  userName?: string
  userRole?: string
  placeholder?: string
}

export function Header({
  userName = 'Marcus Vane',
  userRole = 'Operations Manager',
  placeholder = 'Search resources...',
}: HeaderProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className="h-9 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
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

        {/* Settings */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4.5 w-4.5" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 border-l pl-3">
          <div className="text-right">
            <p className="text-sm font-semibold leading-tight">{userName}</p>
            <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {userRole}
            </p>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
