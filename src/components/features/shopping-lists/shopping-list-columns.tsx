import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { ColumnDef } from '@/components/ui/data-table'
import { formatCurrencyFull, formatRelativeTime } from '@/lib/format'
import type { ShoppingListWithDetails } from '@/types'

export function buildShoppingListColumns(opts: {
  onDelete: (id: string) => void
  deletingId?: string
}): ColumnDef<ShoppingListWithDetails>[] {
  const { onDelete, deletingId } = opts
  return [
  {
    key: 'name',
    header: 'List Name',
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground text-xs">
          ≡
        </div>
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.itemCount} items</p>
        </div>
      </div>
    ),
  },
  {
    key: 'creator',
    header: 'Created By',
    hideOnMobile: true,
    render: (row) => <span className="text-sm">{row.creatorName ?? '—'}</span>,
  },
  {
    key: 'runner',
    header: 'Assigned To',
    hideOnMobile: true,
    render: (row) => <span className="text-sm">{row.runnerName ?? 'Unassigned'}</span>,
  },
  {
    key: 'value',
    header: 'Value',
    render: (row) => (
      <span className="font-semibold">{formatCurrencyFull(row.totalValue ?? '0')}</span>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    render: (row) => (
      <Badge
        variant="outline"
        className={
          row.priority === 'urgent'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-border bg-muted text-muted-foreground'
        }
      >
        {row.priority.toUpperCase()}
      </Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'updated',
    header: 'Last Updated',
    hideOnMobile: true,
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatRelativeTime(row.updatedAt ?? row.createdAt)}
      </span>
    ),
  },
  {
    key: 'actions',
    header: '',
    className: 'w-10',
    render: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link
              to="/shopping-lists/$id"
              params={{ id: row.id }}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          {row.status === 'draft' && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  to="/shopping-lists/$id/edit"
                  params={{ id: row.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={deletingId === row.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(row.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]}
