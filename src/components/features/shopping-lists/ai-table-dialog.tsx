import { useState } from 'react'
import { Expand, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ParsedTable {
  headers: string[]
  rows: string[][]
  title?: string
}

/**
 * Extract markdown tables from text content.
 * Returns an array of { headers, rows, title } objects.
 */
export function extractMarkdownTables(markdown: string): ParsedTable[] {
  const tables: ParsedTable[] = []
  const lines = markdown.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]?.trim()

    // Look for a table header row: | col1 | col2 | ...
    if (line?.startsWith('|') && line.endsWith('|')) {
      // Check if next line is a separator: |---|---|
      const nextLine = lines[i + 1]?.trim()
      if (nextLine && /^\|[\s:]*-+[\s:]*\|/.test(nextLine)) {
        // Found a table — look back for a title
        let title: string | undefined
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prev = lines[j]?.trim()
          if (!prev) continue
          if (prev.startsWith('#')) {
            title = prev.replace(/^#+\s*/, '').replace(/\*\*/g, '')
            break
          }
          if (prev.startsWith('**') && prev.endsWith('**')) {
            title = prev.replace(/\*\*/g, '')
            break
          }
          if (prev.length > 0 && !prev.startsWith('|')) {
            title = prev.replace(/\*\*/g, '')
            break
          }
          break
        }

        // Parse headers
        const headers = line
          .split('|')
          .map((h) => h.trim())
          .filter(Boolean)

        // Skip separator
        i += 2

        // Parse rows
        const rows: string[][] = []
        while (i < lines.length) {
          const rowLine = lines[i]?.trim()
          if (!rowLine?.startsWith('|')) break
          const cells = rowLine
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean)
          if (cells.length > 0) rows.push(cells)
          i++
        }

        if (rows.length > 0) {
          tables.push({ headers, rows, title })
        }
        continue
      }
    }
    i++
  }

  return tables
}

interface AITableDialogProps {
  table: ParsedTable
}

export function AITableDialog({ table }: AITableDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="xs"
        onClick={() => setOpen(true)}
        className="gap-1"
      >
        <Expand className="h-3 w-3" />
        View Table
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl! w-[95vw] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {table.title ?? 'Generated Table'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto -mx-6 px-6">
            <div className="rounded-md border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {table.headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {h.replace(/\*\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {table.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 whitespace-nowrap">
                          {formatCell(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>{table.rows.length} rows</span>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Clean up markdown formatting in cell values */
function formatCell(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/~~/g, '')
    .replace(/`/g, '')
    .trim()
}

interface AITableInlineProps {
  table: ParsedTable
  maxRows?: number
}

/**
 * Inline table preview with expand button.
 * Shows first N rows with an option to view full table in a dialog.
 */
export function AITablePreview({ table, maxRows = 5 }: AITableInlineProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const preview = table.rows.slice(0, maxRows)
  const hasMore = table.rows.length > maxRows

  return (
    <div className="my-2 space-y-1.5">
      {table.title && (
        <p className="text-xs font-semibold">{table.title}</p>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap"
                >
                  {h.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preview.map((row, ri) => (
              <tr key={ri} className="hover:bg-muted/30">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1 whitespace-nowrap">
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {preview.length} of {table.rows.length} rows
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setDialogOpen(true)}
            className="gap-1"
          >
            <Expand className="h-3 w-3" />
            View All ({table.rows.length} rows)
          </Button>
        </div>
      )}

      {!hasMore && table.rows.length > 3 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setDialogOpen(true)}
            className="gap-1 text-muted-foreground"
          >
            <Expand className="h-3 w-3" />
            Expand
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl! w-[95vw] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {table.title ?? 'Generated Table'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto -mx-6 px-6">
            <div className="rounded-md border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {table.headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {h.replace(/\*\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {table.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 whitespace-nowrap">
                          {formatCell(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>{table.rows.length} rows</span>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
