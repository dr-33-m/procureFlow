import { lazy, Suspense, useState } from 'react'
import { Plus, Trash2, ScanLine, X } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateProduct, useCategories } from '@/hooks/use-pantry'
import {
  formatPriceLabel,
  pricePerStockFromSupplier,
  purchasePackSizeOrOne,
  type ProductPricing,
} from '@/server/lib/pricing'

interface SupplierEntry {
  name: string
  pricePerUnit: string
  priceUnit: 'purchase' | 'stock' | 'base'
}

interface AddItemDialogProps {
  open: boolean
  onClose: () => void
}

export function AddItemDialog({ open, onClose }: AddItemDialogProps) {
  const [newName, setNewName] = useState('')
  const [newStockUnit, setNewStockUnit] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newQty, setNewQty] = useState<number>(0)
  const [newQtyUnit, setNewQtyUnit] = useState<'stock' | 'purchase'>('stock')
  const [newParPerGuest, setNewParPerGuest] = useState('')
  const [newParPerGuestUnit, setNewParPerGuestUnit] = useState<'stock' | 'base'>('stock')
  const [newBarcode, setNewBarcode] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierEntry[]>([])
  const [supplierName, setSupplierName] = useState('')
  const [supplierPrice, setSupplierPrice] = useState('')
  const [supplierPriceUnit, setSupplierPriceUnit] = useState<'purchase' | 'stock' | 'base'>('stock')

  // Packaging fields
  const [hasPurchaseUnit, setHasPurchaseUnit] = useState(false)
  const [purchaseUnit, setPurchaseUnit] = useState('')
  const [purchasePackSize, setPurchasePackSize] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [hasBaseUnit, setHasBaseUnit] = useState(false)
  const [baseUnit, setBaseUnit] = useState('')
  const [baseUnitsPerStock, setBaseUnitsPerStock] = useState('')

  const { data: categories = [] } = useCategories()
  const createMutation = useCreateProduct()

  const resetState = () => {
    setNewName('')
    setNewStockUnit('')
    setNewCategory('')
    setNewCategoryInput('')
    setShowNewCategoryInput(false)
    setNewQty(0)
    setNewQtyUnit('stock')
    setNewParPerGuest('')
    setNewParPerGuestUnit('stock')
    setNewBarcode('')
    setSuppliers([])
    setSupplierName('')
    setSupplierPrice('')
    setSupplierPriceUnit('stock')
    setHasPurchaseUnit(false)
    setPurchaseUnit('')
    setPurchasePackSize('')
    setPurchasePrice('')
    setHasBaseUnit(false)
    setBaseUnit('')
    setBaseUnitsPerStock('')
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleAddSupplier = () => {
    if (!supplierName.trim()) return
    setSuppliers((prev) => [
      ...prev,
      {
        name: supplierName.trim(),
        pricePerUnit: supplierPrice.trim(),
        priceUnit: supplierPriceUnit,
      },
    ])
    setSupplierName('')
    setSupplierPrice('')
    setSupplierPriceUnit(hasPurchaseUnit ? 'purchase' : 'stock')
  }

  const handleRemoveSupplier = (index: number) => {
    setSuppliers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateNew = () => {
    if (!newName || !newStockUnit || newQty <= 0) return
    createMutation.mutate(
      {
        name: newName,
        stockUnit: newStockUnit,
        category: newCategory || 'General',
        initialQuantity: newQty,
        initialQuantityUnit: newQtyUnit,
        parPerGuest: newParPerGuest ? parseFloat(newParPerGuest) : null,
        parPerGuestUnit: newParPerGuestUnit,
        purchaseUnit: hasPurchaseUnit ? purchaseUnit || null : null,
        purchasePackSize: hasPurchaseUnit && purchasePackSize ? parseFloat(purchasePackSize) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        baseUnit: hasBaseUnit ? baseUnit || null : null,
        baseUnitsPerStock: hasBaseUnit && baseUnitsPerStock ? parseFloat(baseUnitsPerStock) : null,
        barcode: newBarcode.trim() || null,
        suppliers: suppliers.map((s) => ({
          name: s.name,
          pricePerUnit: s.pricePerUnit ? parseFloat(s.pricePerUnit) : null,
          priceUnit: s.priceUnit,
        })),
      },
      { onSuccess: handleClose },
    )
  }

  const handleBarcodeScan = (barcodes: DetectedBarcode[]) => {
    if (barcodes.length > 0) {
      setNewBarcode(barcodes[0].rawValue)
      setScannerOpen(false)
    }
  }

  // When purchase unit toggle turns on, default units to 'purchase'.
  const handlePurchaseUnitToggle = (checked: boolean) => {
    setHasPurchaseUnit(checked)
    if (checked) {
      setNewQtyUnit('purchase')
      setSupplierPriceUnit('purchase')
    } else {
      setNewQtyUnit('stock')
      setSupplierPriceUnit('stock')
    }
  }

  const pricingPreview: ProductPricing | null =
    purchasePrice || (hasPurchaseUnit && purchaseUnit)
      ? {
          stockUnit: newStockUnit || 'unit',
          purchaseUnit: hasPurchaseUnit ? purchaseUnit || null : null,
          purchasePackSize: hasPurchaseUnit && purchasePackSize ? purchasePackSize : null,
          purchasePrice: purchasePrice || null,
          baseUnit: hasBaseUnit ? baseUnit || null : null,
          baseUnitsPerStock: hasBaseUnit && baseUnitsPerStock ? baseUnitsPerStock : null,
        }
      : null

  const newQtyInStock =
    newQtyUnit === 'purchase' && pricingPreview
      ? newQty * purchasePackSizeOrOne(pricingPreview)
      : newQty

  const supplierNormalized =
    supplierPrice && pricingPreview && parseFloat(supplierPrice) > 0
      ? pricePerStockFromSupplier(parseFloat(supplierPrice), supplierPriceUnit, pricingPreview)
      : null

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Product to Inventory</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. Olive Oil"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Stock Unit</label>
              <Input
                placeholder="e.g. bottle, kg, each"
                value={newStockUnit}
                onChange={(e) => setNewStockUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Category</label>
              {showNewCategoryInput ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="New category name"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCategoryInput.trim()) {
                        setNewCategory(newCategoryInput.trim())
                        setShowNewCategoryInput(false)
                        setNewCategoryInput('')
                      }
                      if (e.key === 'Escape') {
                        setShowNewCategoryInput(false)
                        setNewCategoryInput('')
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!newCategoryInput.trim()}
                    onClick={() => {
                      if (newCategoryInput.trim()) {
                        setNewCategory(newCategoryInput.trim())
                        setShowNewCategoryInput(false)
                        setNewCategoryInput('')
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Cancel"
                    onClick={() => {
                      setShowNewCategoryInput(false)
                      setNewCategoryInput('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={newCategory}
                    onValueChange={setNewCategory}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Add new category"
                    onClick={() => setShowNewCategoryInput(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Initial Qty</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={newQty === 0 ? '' : newQty}
                  onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                />
                {hasPurchaseUnit && purchaseUnit && (
                  <Select
                    value={newQtyUnit}
                    onValueChange={(v) => setNewQtyUnit(v as 'stock' | 'purchase')}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">{purchaseUnit}s</SelectItem>
                      <SelectItem value="stock">{newStockUnit || 'units'}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {newQtyUnit === 'purchase' && pricingPreview && newQty > 0 && (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  = {newQtyInStock} {newStockUnit || 'units'}
                </p>
              )}
            </div>
          </div>

          {/* Price field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {hasPurchaseUnit && purchaseUnit
                ? `Price / ${purchaseUnit}`
                : `Price / ${newStockUnit || 'stock unit'}`}{' '}
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

          {/* Packaging toggles */}
          <div className="space-y-3 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={hasPurchaseUnit}
                onChange={(e) => handlePurchaseUnitToggle(e.target.checked)}
                className="rounded"
              />
              Sold by case / box
            </label>
            {hasPurchaseUnit && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Purchase Unit</label>
                  <Input
                    placeholder="e.g. case, box"
                    value={purchaseUnit}
                    onChange={(e) => setPurchaseUnit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {newStockUnit || 'units'} per {purchaseUnit || 'pack'}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 6"
                    value={purchasePackSize}
                    onChange={(e) => setPurchasePackSize(e.target.value)}
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={hasBaseUnit}
                onChange={(e) => setHasBaseUnit(e.target.checked)}
                className="rounded"
              />
              Has sub-unit (ml, g, slice, etc.)
            </label>
            {hasBaseUnit && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Base Unit</label>
                  <Input
                    placeholder="e.g. ml, g, slice"
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    {baseUnit || 'base units'} per {newStockUnit || 'stock unit'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g. 16"
                    value={baseUnitsPerStock}
                    onChange={(e) => setBaseUnitsPerStock(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Price preview */}
          {pricingPreview && parseFloat(purchasePrice || '0') > 0 && (
            <p className="text-xs text-muted-foreground italic">
              {formatPriceLabel(pricingPreview)}
            </p>
          )}

          {/* Par Per Guest */}
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
                placeholder="e.g. 2"
                value={newParPerGuest}
                onChange={(e) => setNewParPerGuest(e.target.value)}
                className="flex-1"
              />
              {hasBaseUnit && baseUnit && (
                <Select
                  value={newParPerGuestUnit}
                  onValueChange={(v) => setNewParPerGuestUnit(v as 'stock' | 'base')}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">
                      {baseUnit}/guest
                    </SelectItem>
                    <SelectItem value="stock">
                      {newStockUnit || 'unit'}/guest
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {(!hasBaseUnit || !baseUnit) && (
                <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                  {newStockUnit || 'unit'}/guest
                </span>
              )}
            </div>
            {newParPerGuest &&
              newParPerGuestUnit === 'base' &&
              hasBaseUnit &&
              baseUnitsPerStock && (
                <p className="mt-1 text-xs text-muted-foreground italic">
                  ≈ {(parseFloat(newParPerGuest) / parseFloat(baseUnitsPerStock)).toFixed(3)}{' '}
                  {newStockUnit || 'units'}/guest
                </p>
              )}
          </div>

          {/* Barcode */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Barcode{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Scan or type barcode"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
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
            <label className="mb-2 block text-sm font-medium">
              Suppliers{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>

            {suppliers.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {suppliers.map((s, i) => {
                  const normalized =
                    s.pricePerUnit && pricingPreview && parseFloat(s.pricePerUnit) > 0
                      ? pricePerStockFromSupplier(
                          parseFloat(s.pricePerUnit),
                          s.priceUnit,
                          pricingPreview,
                        )
                      : null
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{s.name}</span>
                        {s.pricePerUnit && (
                          <span className="ml-2 text-muted-foreground">
                            ${parseFloat(s.pricePerUnit).toFixed(2)}/{s.priceUnit === 'purchase' ? purchaseUnit || 'pack' : s.priceUnit === 'base' ? baseUnit || 'unit' : newStockUnit || 'unit'}
                          </span>
                        )}
                        {normalized != null &&
                          s.priceUnit !== 'stock' &&
                          !isNaN(normalized) && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (≈ ${normalized.toFixed(2)}/{newStockUnit || 'unit'})
                            </span>
                          )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSupplier(i)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Supplier name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
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
                  value={supplierPrice}
                  onChange={(e) => setSupplierPrice(e.target.value)}
                  className="pl-6"
                />
              </div>
              <Select
                value={supplierPriceUnit}
                onValueChange={(v) => setSupplierPriceUnit(v as 'purchase' | 'stock' | 'base')}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hasPurchaseUnit && purchaseUnit && (
                    <SelectItem value="purchase">/{purchaseUnit}</SelectItem>
                  )}
                  <SelectItem value="stock">/{newStockUnit || 'unit'}</SelectItem>
                  {hasBaseUnit && baseUnit && (
                    <SelectItem value="base">/{baseUnit}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSupplier}
                disabled={!supplierName.trim()}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {supplierNormalized != null && !isNaN(supplierNormalized) && supplierPriceUnit !== 'stock' && (
              <p className="mt-1 text-xs text-muted-foreground italic">
                ≈ ${supplierNormalized.toFixed(2)} / {newStockUnit || 'unit'}
              </p>
            )}
          </div>

          <div className="flex justify-end">
          <Button
            onClick={handleCreateNew}
            disabled={createMutation.isPending || !newName || !newStockUnit || newQty <= 0}
          >
            {createMutation.isPending ? 'Creating...' : 'Create & Add to Inventory'}
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
