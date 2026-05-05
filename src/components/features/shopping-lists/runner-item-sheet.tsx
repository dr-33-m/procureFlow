import { lazy, Suspense, useEffect, useState } from 'react'
import { Loader2, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatQuantity } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateShoppingListItem, useSetProductBarcode } from '@/hooks/use-shopping-lists'
import type { ShoppingListDetailItem } from '@/types'

const BarcodeScanner = lazy(() =>
  import('react-barcode-scanner').then((m) => ({ default: m.BarcodeScanner })),
)

type ItemStatus = 'pending' | 'found' | 'partial' | 'not_found'

interface RunnerItemSheetProps {
  item: ShoppingListDetailItem
  listId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RunnerItemSheet({ item, listId, open, onOpenChange }: RunnerItemSheetProps) {
  const updateMutation = useUpdateShoppingListItem(listId)
  const setBarcodeMutation = useSetProductBarcode(listId)

  const [status, setStatus] = useState<ItemStatus>((item.status as ItemStatus) ?? 'pending')
  const [purchasedQty, setPurchasedQty] = useState(parseFloat(item.purchasedQuantity ?? '0'))
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [unitPrice, setUnitPrice] = useState(parseFloat(item.pricePerStockUnit ?? '0'))
  const [barcodeScanOpen, setBarcodeScanOpen] = useState(false)

  useEffect(() => {
    setStatus((item.status as ItemStatus) ?? 'pending')
    setPurchasedQty(parseFloat(item.purchasedQuantity ?? '0'))
    setSelectedSupplierId('')
    setUnitPrice(parseFloat(item.pricePerStockUnit ?? '0'))
    setBarcodeScanOpen(false)
  }, [item.id])

  const handleStatusChange = (next: ItemStatus) => {
    setStatus(next)
    if (next === 'not_found') setPurchasedQty(0)
    if (next === 'found') setPurchasedQty(parseFloat(item.requestedQuantity ?? '0'))
  }

  const handleSupplierChange = (id: string) => {
    setSelectedSupplierId(id)
    if (id === 'none') return
    const supplier = item.suppliers.find((s) => s.id === id)
    if (supplier?.pricePerUnit) setUnitPrice(parseFloat(supplier.pricePerUnit))
  }

  const handleSave = () => {
    updateMutation.mutate(
      {
        id: item.id,
        status,
        purchasedQuantity: status === 'not_found' ? 0 : purchasedQty,
        pricePerStockUnit: unitPrice,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  const statuses: { value: ItemStatus; label: string }[] = [
    { value: 'found', label: 'Found' },
    { value: 'partial', label: 'Partial' },
    { value: 'not_found', label: 'Not Found' },
  ]

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="flex h-full flex-col overflow-hidden">
          <DrawerHeader className="border-b px-5 pb-4 text-left">
            <DrawerTitle className="text-lg">{item.productName}</DrawerTitle>
            <DrawerDescription>
              Requested: {formatQuantity(item.requestedQuantity)} {item.stockUnit}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Status */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <div className="flex gap-2">
                {statuses.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleStatusChange(value)}
                    className={cn(
                      'flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-colors',
                      status === value
                        ? value === 'found'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : value === 'partial'
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-red-300 bg-red-50 text-red-700'
                        : 'border-border bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchased Quantity */}
            {status !== 'not_found' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Purchased Quantity{' '}
                  <span className="text-muted-foreground">({item.stockUnit})</span>
                </p>
                <QuantityStepper value={purchasedQty} onChange={setPurchasedQty} min={0} />
              </div>
            )}

            {/* Supplier */}
            {item.suppliers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Supplier</p>
                <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Supplier</SelectItem>
                    {item.suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.pricePerUnit ? ` — $${parseFloat(s.pricePerUnit).toFixed(2)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Unit Price */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Unit Price{' '}
                <span className="text-muted-foreground">(per {item.stockUnit})</span>
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitPrice === 0 ? '' : unitPrice}
                  placeholder="0.00"
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="pl-6"
                />
              </div>
            </div>

            {/* Barcode */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Barcode</p>
              {item.productBarcode ? (
                <p className="rounded-lg border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
                  {item.productBarcode}
                </p>
              ) : barcodeScanOpen ? (
                <div className="overflow-hidden rounded-xl">
                  <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
                    <BarcodeScanner
                      options={{
                        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
                      }}
                      onCapture={(det) => {
                        const code = det[0]?.rawValue
                        if (!code) return
                        setBarcodeScanOpen(false)
                        setBarcodeMutation.mutate({
                          productId: item.productId!,
                          barcode: code,
                        })
                      }}
                    />
                  </Suspense>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-muted-foreground"
                    onClick={() => setBarcodeScanOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled={setBarcodeMutation.isPending}
                  onClick={() => setBarcodeScanOpen(true)}
                >
                  {setBarcodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                  Scan to Register Barcode
                </Button>
              )}
            </div>
          </div>

          <DrawerFooter className="border-t px-5 py-4">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
