import { MapPin, ChevronsUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import { useBranchContext } from '@/stores/branch-context'
import { useQueryClient } from '@tanstack/react-query'

export function Header() {
  const { canSwitchBranch } = usePermissions()
  const { activeBranchName, branches, setActiveBranch } = useBranchContext()
  const queryClient = useQueryClient()

  const handleBranchSwitch = (id: string) => {
    setActiveBranch(id)
    // Invalidate all queries so data reloads for the new branch
    queryClient.invalidateQueries()
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      {/* Mobile sidebar trigger */}
      <SidebarTrigger className="-ml-1" />

      <div className="h-5 w-px bg-border" />

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Branch selector — dropdown for owner/admin, static text for chef/runner */}
        {canSwitchBranch ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="inline">{activeBranchName || 'Select branch'}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch branch
              </DropdownMenuLabel>
              {branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  onSelect={() => handleBranchSwitch(branch.id)}
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {branch.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          activeBranchName ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="inline">{activeBranchName}</span>
            </div>
          ) : null
        )}
      </div>
    </header>
  )
}
