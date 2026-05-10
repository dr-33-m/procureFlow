import { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle, X } from 'lucide-react'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useImportInventoryFromCSV } from '@/hooks/use-pantry'

interface CSVRow {
  name: string
  stockUnit: string
  category: string
  initialQuantity: number
  parPerGuest?: number | null
  // Packaging hierarchy: PURCHASE (box/case) → STOCK (each/bottle) → BASE (ml/g)
  purchaseUnit?: string | null       // e.g. "case", "box"
  purchasePackSize?: number | null   // stock units per purchase unit, e.g. 12
  purchasePrice?: number | null      // price per purchase unit
  baseUnit?: string | null           // e.g. "ml", "g", "slice"
  baseUnitsPerStock?: number | null  // base units per stock unit, e.g. 750 (ml per bottle)
  supplier?: string
  barcode?: string | null
  _error?: string
}

interface ImportInventoryDialogProps {
  open: boolean
  onClose: () => void
}

export function ImportInventoryDialog({ open, onClose }: ImportInventoryDialogProps) {
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([])
  const [parseError, setParseError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const importMutation = useImportInventoryFromCSV()

  const downloadTemplate = () => {
    const headers = [
      'name',
      'stockUnit',
      'category',
      'initialQuantity',
      'parPerGuest',
      'purchaseUnit',
      'purchasePackSize',
      'purchasePrice',
      'baseUnit',
      'baseUnitsPerStock',
      'supplier',
      'barcode',
    ].join(',')

    // Example rows covering common packaging scenarios
    const examples = [
      // Simple item: bottles purchased individually
      'Olive Oil,bottle,Oils & Fats,10,0.05,,,18.50,,,Prime Logistics Co.,6001234567890',
      // Case-packed item: 12 bottles per case at $120/case
      'Red Wine,bottle,Beverages,24,0.1,case,12,120.00,ml,750,Cape Wines,',
      // Weight item: purchased per kg, portioned in grams
      'Chicken Breast,kg,Proteins,15,0.2,,,85.00,g,1000,Farm Fresh,',
      // Bag of rice: 25 kg bags, portioned per kg
      'Rice,kg,Grains,50,0.1,bag,25,75.00,,,Grain Masters,6009876543210',
    ].join('\n')

    const csv = `${headers}\n${examples}\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError('')
    setParsedRows([])

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setParseError(`Parse error: ${result.errors[0].message}`)
          return
        }
        const rows: CSVRow[] = result.data.map((r) => {
          const qty = parseFloat(r.initialQuantity ?? '0')
          const ppg = r.parPerGuest ? parseFloat(r.parPerGuest) : null
          const purchasePrice = r.purchasePrice ? parseFloat(r.purchasePrice) : null
          const purchasePackSize = r.purchasePackSize ? parseFloat(r.purchasePackSize) : null
          const baseUnitsPerStock = r.baseUnitsPerStock ? parseFloat(r.baseUnitsPerStock) : null
          const errors: string[] = []
          if (!r.name) errors.push('name required')
          if (!r.stockUnit) errors.push('stockUnit required')
          if (isNaN(qty)) errors.push('invalid qty')
          return {
            name: r.name ?? '',
            stockUnit: r.stockUnit ?? '',
            category: r.category ?? 'General',
            initialQuantity: isNaN(qty) ? 0 : qty,
            parPerGuest: ppg,
            purchaseUnit: r.purchaseUnit?.trim() || null,
            purchasePackSize,
            purchasePrice,
            baseUnit: r.baseUnit?.trim() || null,
            baseUnitsPerStock,
            supplier: r.supplier?.trim() || undefined,
            barcode: r.barcode?.trim() || null,
            _error: errors.length > 0 ? errors.join(', ') : undefined,
          }
        })
        setParsedRows(rows)
      },
    })
  }

  const validRows = parsedRows.filter((r) => !r._error)

  const clearFile = () => {
    setParsedRows([])
    setParseError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    clearFile()
    onClose()
  }

  const handleImport = () => {
    if (validRows.length === 0) return
    importMutation.mutate({ rows: validRows }, { onSuccess: handleClose })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Inventory from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Need a template?</p>
              <p className="text-xs text-muted-foreground">
                Download the CSV template with required column headers.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
              <FileText className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Upload CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {parsedRows.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview —{' '}
                  <span className="text-primary">{validRows.length} valid</span>
                  {parsedRows.length - validRows.length > 0 && (
                    <span className="ml-1 text-red-600">
                      · {parsedRows.length - validRows.length} with errors
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border text-sm">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Stock Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Par/Guest</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Buy Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Pack Size</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Buy Price</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Base Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Base/Stock</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Supplier</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Barcode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={row._error ? 'bg-red-50' : ''}>
                        <td className="px-3 py-1.5">
                          {row.name || <span className="italic text-red-500">missing</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.stockUnit || <span className="italic text-red-500">missing</span>}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.category}</td>
                        <td className="px-3 py-1.5">{row.initialQuantity}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.parPerGuest ?? '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.purchaseUnit ?? '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.purchasePackSize ?? '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {row.purchasePrice != null ? `$${row.purchasePrice}` : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.baseUnit ?? '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.baseUnitsPerStock ?? '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.supplier ?? '—'}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.barcode ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || importMutation.isPending}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importMutation.isPending
                ? 'Importing...'
                : `Import ${validRows.length} Item${validRows.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
