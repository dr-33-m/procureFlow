import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef as TanstackColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// ── Column definition ────────────────────────────────────────────────────────

export type ColumnDef<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
  enableSorting?: boolean
  accessorKey?: string
  hideOnMobile?: boolean
}

// ── Props ────────────────────────────────────────────────────────────────────

type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T>[]
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  emptyMessage?: string
  isLoading?: boolean
  skeletonRows?: number
  globalFilter?: string
}

// ── Component ────────────────────────────────────────────────────────────────

export function DataTable<T extends object>({
  data,
  columns,
  onRowClick,
  rowClassName,
  emptyMessage = 'No data found.',
  isLoading = false,
  skeletonRows = 5,
  globalFilter,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const tanstackColumns: TanstackColumnDef<T>[] = columns.map((col) => ({
    id: col.key,
    accessorKey: col.accessorKey ?? col.key,
    header: ({ column }) => {
      if (!col.enableSorting) {
        return (
          <span className={cn('text-xs font-semibold tracking-wider uppercase', col.headerClassName)}>
            {col.header}
          </span>
        )
      }
      return (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 text-xs font-semibold tracking-wider uppercase hover:text-foreground transition-colors"
        >
          {col.header}
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      )
    },
    cell: ({ row }) => col.render(row.original),
    enableSorting: col.enableSorting ?? false,
  }))

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase text-muted-foreground',
                    col.hideOnMobile && 'hidden sm:table-cell',
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.hideOnMobile && 'hidden sm:table-cell')}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header, i) => (
                <th
                  key={header.id}
                  className={cn(
                    'px-4 py-3 text-left text-muted-foreground',
                    columns[i]?.hideOnMobile && 'hidden sm:table-cell',
                    columns[i]?.headerClassName,
                  )}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  'border-b transition-colors last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                  rowClassName?.(row.original),
                )}
              >
                {row.getVisibleCells().map((cell, i) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'px-4 py-3',
                      columns[i]?.hideOnMobile && 'hidden sm:table-cell',
                      columns[i]?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
