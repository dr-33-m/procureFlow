import { lazy, Suspense, useState } from 'react'
import { Plus, Trash2, ScanLine } from 'lucide-react'
import type { DetectedBarcode } from 'react-barcode-scanner'

const BarcodeScanner = lazy(() => {
  import('react-barcode-scanner/polyfill')
  return import('react-barcode-scanner').then((m) => ({ default: m.BarcodeScanner }))
})
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUpdateInventoryItem, useCreateProductSupplier, useDeleteProductSupplier } from '@/hooks/use-pantry'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPriceLabel, pricePerStockFromSupplier, servingsPerStockUnit, type ProductPricing } from '@/server/lib/pricing'
import { SERVING_PRESETS } from '@/lib/constants'
import type { InventoryWithProduct } from '@/types'

interface EditItemDialogProps {
  item: InventoryWithProduct | null
  onClose: () => void
}

export function EditItemDialog({ item, onClose }: EditItemDialogProps) {
  const [qty, setQty] = useState<number>(parseFloat(item?.quantity ?? '0'))
  const [parPerGuest, setParPerGuest] = useState<string>(item?.parPerGuest ?? '')
  const [parPerGuestUnit, setParPerGuestUnit] = useState<'stock' | 'base' | 'serving'>(() => {
    const raw = (item?.parPerGuestUnit as 'stock' | 'base' | 'serving') ?? 'stock'
    // When servingUnit === baseUnit, 'serving' is misleading (it means N×servingSize base units,
    // not N base units). Normalize to 'base' so the math is correct.
    if (raw === 'serving' && item?.servingUnit && item?.baseUnit
        && item.servingUnit.toLowerCase() === item.baseUnit.toLowerCase()) {
      return 'base'
    }
    return raw
  })
  const [editServingUnit, setEditServingUnit] = useState<string>(item?.servingUnit ?? '')
  const [editServingSize, setEditServingSize] = useState<string>(
    item?.servingSize ? parseFloat(item.servingSize).toString() : '',
  )
  const [purchasePrice, setPurchasePrice] = useState<string>(
    item?.purchasePrice ? parseFloat(item.purchasePrice).toFixed(2) : '',
  )
  const [barcode, setBarcode] = useState<string>(item?.productSku ?? '')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPrice, setNewSupplierPrice] = useState('')
  const [newSupplierPriceUnit, setNewSupplierPriceUnit] = useState<'purchase' | 'stock' | 'base'>(
    item?.purchaseUnit ? 'purchase' : 'stock',
  )

  const updateMutation = useUpdateInventoryItem()
  const createSupplierMutation = useCreateProductSupplier(item?.productId ?? '')
  const deleteSupplierMutation = useDeleteProductSupplier()

  const handleSubmit = () => {
    if (!item) return
    updateMutation.mutate(
      {
        inventoryId: item.id,
        quantity: qty,
        parPerGuest: parPerGuest ? parseFloat(parPerGuest) : null,
        parPerGuestUnit,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        servingUnit: editServingUnit || null,
        servingSize: editServingSize ? parseFloat(editServingSize) : null,
        barcode: barcode.trim() || null,
      },
      { onSuccess: onClose },
    )
  }

  const handleBarcodeScan = (barcodes: DetectedBarcode[]) => {
    if (barcodes.length > 0) {
      setBarcode(barcodes[0].rawValue)
      setScannerOpen(false)
    }
  }

  const handleAddSupplier = () => {
    if (!newSupplierName.trim()) return
    createSupplierMutation.mutate(
      {
        name: newSupplierName.trim(),
        pricePerUnit: newSupplierPrice ? parseFloat(newSupplierPrice) : null,
        priceUnit: newSupplierPriceUnit,
      },
      {
        onSuccess: () => {
          setNewSupplierName('')
          setNewSupplierPrice('')
        },
      },
    )
  }

  const suppliers = item?.suppliers ?? []

  const pricingPreview: ProductPricing | null = item
    ? {
        stockUnit: item.stockUnit,
        purchaseUnit: item.purchaseUnit ?? null,
        purchasePackSize: item.purchasePackSize ?? null,
        purchasePrice: purchasePrice || (item.purchasePrice ?? null),
        baseUnit: item.baseUnit ?? null,
        baseUnitsPerStock: item.baseUnitsPerStock ?? null,
        servingUnit: editServingUnit || null,
        servingSize: editServingSize || null,
      }
    : null

  return (
    <>
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit: {item?.productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Quantity ({item?.stockUnit})
              </label>
              <Input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {item?.purchaseUnit
                  ? `Price / ${item.purchaseUnit}`
                  : `Price / ${item?.stockUnit ?? 'unit'}`}{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="pl-6"
                />
              </div>
            </div>
          </div>

          {/* Pricing preview */}
          {pricingPreview && parseFloat(purchasePrice || '0') > 0 && (
            <p className="text-xs text-muted-foreground italic">
              {formatPriceLabel(pricingPreview)}
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Par Per Guest{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 0.25"
                value={parPerGuest}
                onChange={(e) => setParPerGuest(e.target.value)}
                className="flex-1"
              />
              {item?.baseUnit ? (
                <Select
                  value={parPerGuestUnit}
                  onValueChange={(v) => setParPerGuestUnit(v as 'stock' | 'base' | 'serving')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editServingUnit && editServingSize
                      && editServingUnit.toLowerCase() !== item.baseUnit?.toLowerCase() && (
                      <SelectItem value="serving">
                        {editServingUnit}/guest
                      </SelectItem>
                    )}
                    <SelectItem value="base">
                      {item.baseUnit}/guest
                    </SelectItem>
                    <SelectItem value="stock">
                      {item.stockUnit}/guest
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                  {item?.stockUnit || 'unit'}/guest
                </span>
              )}
            </div>
            {parPerGuest &&
              parPerGuestUnit === 'serving' &&
              editServingUnit &&
              editServingSize &&
              item?.baseUnitsPerStock &&
              parseFloat(editServingSize) > 0 &&
              parseFloat(item.baseUnitsPerStock) > 0 && (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  ≈ {((parseFloat(parPerGuest) * parseFloat(editServingSize)) / parseFloat(item.baseUnitsPerStock)).toFixed(3)}{' '}
                  {item.stockUnit}/guest
                  {pricingPreview && servingsPerStockUnit(pricingPreview) != null && (
                    <> · 1 {item.stockUnit} serves {Math.floor(servingsPerStockUnit(pricingPreview)! / parseFloat(parPerGuest))} guests</>
                  )}
                </p>
              )}
            {parPerGuest &&
              parPerGuestUnit === 'base' &&
              item?.baseUnitsPerStock && (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  ≈ {(parseFloat(parPerGuest) / parseFloat(item.baseUnitsPerStock)).toFixed(3)}{' '}
                  {item.stockUnit}/guest
                </p>
              )}
          </div>

          {/* Serving unit setup (only when product has a base unit) */}
          {item?.baseUnit && item?.baseUnitsPerStock && (
            <div className="space-y-2 rounded-lg border p-3">
              <label className="block text-sm font-medium">
                Serving unit{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="e.g. glass, tbsp, slice"
                  value={editServingUnit}
                  onChange={(e) => {
                    const name = e.target.value
                    setEditServingUnit(name)
                    const presets = SERVING_PRESETS[name.toLowerCase()]
                    const match = presets?.find((p) => p.baseUnit === item.baseUnit?.toLowerCase())
                    if (match) setEditServingSize(match.size.toString())
                  }}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={`${item.baseUnit} per serving`}
                  value={editServingSize}
                  onChange={(e) => setEditServingSize(e.target.value)}
                />
              </div>
              {editServingUnit && editServingSize && parseFloat(item.baseUnitsPerStock) > 0 && parseFloat(editServingSize) > 0 && (
                <p className="text-xs text-muted-foreground italic">
                  1 {item.stockUnit} = {Math.floor(parseFloat(item.baseUnitsPerStock) / parseFloat(editServingSize))} {editServingUnit}s
                </p>
              )}
            </div>
          )}

          {/* Barcode */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Barcode{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Scan or type barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setScannerOpen(true)}
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suppliers */}
          <div>
            <label className="mb-2 block text-sm font-medium">Suppliers</label>

            {suppliers.length > 0 ? (
              <div className="mb-2 space-y-1.5">
                {suppliers.map((s) => {
                  const normalized =
                    s.pricePerUnit && pricingPreview && parseFloat(s.pricePerUnit) > 0
                      ? pricePerStockFromSupplier(
                          parseFloat(s.pricePerUnit),
                          (s.priceUnit as 'purchase' | 'stock' | 'base') ?? 'stock',
                          pricingPreview,
                        )
                      : null
                  const unitLabel =
                    s.priceUnit === 'purchase'
                      ? item?.purchaseUnit ?? 'pack'
                      : s.priceUnit === 'base'
                        ? item?.baseUnit ?? 'unit'
                        : item?.stockUnit ?? 'unit'
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{s.name}</span>
                        {s.pricePerUnit && (
                          <span className="ml-2 text-muted-foreground">
                            ${parseFloat(s.pricePerUnit).toFixed(2)}/{unitLabel}
                          </span>
                        )}
                        {normalized != null &&
                          s.priceUnit !== 'stock' &&
                          !isNaN(normalized) && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (≈ ${normalized.toFixed(2)}/{item?.stockUnit})
                            </span>
                          )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSupplierMutation.mutate(s.id)}
                        disabled={deleteSupplierMutation.isPending}
                        className="text-muted-foreground hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mb-2 text-xs text-muted-foreground">No suppliers added yet.</p>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Supplier name"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSupplier()}
                className="flex-1"
              />
              <div className="relative w-24">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={newSupplierPrice}
                  onChange={(e) => setNewSupplierPrice(e.target.value)}
                  className="pl-6"
                />
              </div>
              <Select
                value={newSupplierPriceUnit}
                onValueChange={(v) => setNewSupplierPriceUnit(v as 'purchase' | 'stock' | 'base')}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {item?.purchaseUnit && (
                    <SelectItem value="purchase">/{item.purchaseUnit}</SelectItem>
                  )}
                  <SelectItem value="stock">/{item?.stockUnit ?? 'unit'}</SelectItem>
                  {item?.baseUnit && (
                    <SelectItem value="base">/{item.baseUnit}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSupplier}
                disabled={!newSupplierName.trim() || createSupplierMutation.isPending}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {(() => {
              const normalized =
                newSupplierPrice && pricingPreview && parseFloat(newSupplierPrice) > 0
                  ? pricePerStockFromSupplier(parseFloat(newSupplierPrice), newSupplierPriceUnit, pricingPreview)
                  : null
              return normalized != null && !isNaN(normalized) && newSupplierPriceUnit !== 'stock' ? (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  ≈ ${normalized.toFixed(2)} / {item?.stockUnit ?? 'unit'}
                </p>
              ) : null
            })()}
          </div>

          <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Sheet open={scannerOpen} onOpenChange={setScannerOpen}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0">
        <SheetHeader className="px-5 py-4">
          <SheetTitle>Scan Barcode</SheetTitle>
          <SheetDescription>Point your camera at a product barcode</SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-5 pb-5">
          <div className="h-full overflow-hidden rounded-xl bg-black">
            {scannerOpen && (
              <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
                <BarcodeScanner
                  onCapture={handleBarcodeScan}
                  options={{
                    formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
                    delay: 500,
                  }}
                  className="h-full w-full object-cover"
                />
              </Suspense>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
