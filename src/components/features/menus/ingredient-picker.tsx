import { useMemo, useState } from 'react'
import { Loader2, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCreateProductForIngredient, usePantryCatalog } from '@/hooks/use-pantry'

export type PickableProduct = {
  id: string
  name: string
  stockUnit: string
  baseUnit: string | null
  servingUnit: string | null
}

interface IngredientPickerProps {
  excludeProductIds?: Array<string>
  onPick: (product: PickableProduct) => void
}

export function IngredientPicker({ excludeProductIds = [], onPick }: IngredientPickerProps) {
  const { data: catalog = [] } = usePantryCatalog()
  const createProduct = useCreateProductForIngredient()
  const [query, setQuery] = useState('')
  // Inline "create new" panel state.
  const [creating, setCreating] = useState(false)
  const [newStockUnit, setNewStockUnit] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const excluded = new Set(excludeProductIds)
    return catalog
      .filter((p) => !excluded.has(p.id))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, 8)
  }, [catalog, query, excludeProductIds])

  const trimmed = query.trim()
  // Offer create only when the typed name isn't already an exact catalog match.
  const exactMatch = catalog.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
  const canOfferCreate = trimmed.length > 0 && !exactMatch

  const handleCreate = async () => {
    if (!trimmed || !newStockUnit.trim()) return
    const product = await createProduct.mutateAsync({
      name: trimmed,
      stockUnit: newStockUnit.trim(),
    })
    onPick({
      id: product.id,
      name: product.name,
      stockUnit: product.stockUnit,
      baseUnit: product.baseUnit,
      servingUnit: product.servingUnit,
    })
    setQuery('')
    setNewStockUnit('')
    setCreating(false)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCreating(false)
          }}
          placeholder="Search products, or type a new ingredient…"
          className="pl-8"
        />
      </div>

      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border bg-popover">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onPick({
                  id: p.id,
                  name: p.name,
                  stockUnit: p.stockUnit,
                  baseUnit: p.baseUnit,
                  servingUnit: p.servingUnit,
                })
                setQuery('')
              }}
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.baseUnit ?? p.stockUnit}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pick-or-create: when the typed ingredient isn't in the pantry, mint it
          on the spot so a chef never has to leave the recipe. */}
      {canOfferCreate &&
        (creating ? (
          <div className="flex items-end gap-2 rounded-md border bg-muted/30 p-2">
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                New product: <span className="font-medium text-foreground">{trimmed}</span>
              </p>
              <Input
                value={newStockUnit}
                onChange={(e) => setNewStockUnit(e.target.value)}
                placeholder="Stock unit (e.g. kg, L, each)"
                className="h-8"
                autoFocus
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-1"
              disabled={!newStockUnit.trim() || createProduct.isPending}
              onClick={handleCreate}
            >
              {createProduct.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Create new product “{trimmed}”
          </button>
        ))}
    </div>
  )
}
