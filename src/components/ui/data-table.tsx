import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  emptyMessage?: string
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
}

export function DataTable<T>({
  data,
  columns,
  emptyMessage = 'No data found.',
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={cn('text-xs font-semibold tracking-wider uppercase', col.headerClassName)}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="py-12 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, i) => (
            <TableRow
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                onRowClick && 'cursor-pointer',
                rowClassName?.(row),
              )}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
