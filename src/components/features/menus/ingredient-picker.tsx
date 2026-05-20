import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePantryCatalog } from '@/hooks/use-pantry'

export type PickableProduct = {
  id: string
  name: string
  stockUnit: string
  baseUnit: string | null
  servingUnit: string | null
}

interface IngredientPickerProps {
  excludeProductIds?: string[]
  onPick: (product: PickableProduct) => void
}

export function IngredientPicker({ excludeProductIds = [], onPick }: IngredientPickerProps) {
  const { data: catalog = [] } = usePantryCatalog()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const excluded = new Set(excludeProductIds)
    return catalog
      .filter((p) => !excluded.has(p.id))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, 8)
  }, [catalog, query, excludeProductIds])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products to add to recipe…"
          className="pl-8"
        />
      </div>

      {query.trim() && results.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">No products match.</p>
      )}

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
              <span className="text-xs text-muted-foreground">
                {p.baseUnit ?? p.stockUnit}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
