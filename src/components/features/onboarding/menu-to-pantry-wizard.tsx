import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Loader2, NotepadText } from 'lucide-react'
import type { GenProductWithPar, PantryProposal } from '@/lib/pantry-gen'
import type {EditorDish, EditorMenu} from '@/components/features/menus/menu-recipe-editor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  
  
  MenuRecipeEditor
} from '@/components/features/menus/menu-recipe-editor'
import {
  useApplyPantryFromMenus,
  useCommitPantry,
  useDerivePantryFromMenus,
  useGeneratePantry,
} from '@/hooks/use-ai-pantry-gen'
import { useMenus } from '@/hooks/use-menus'
import { deriveParByProduct } from '@/lib/pantry-gen'
import { cn } from '@/lib/utils'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// Review row: the product spec + the pricing/opening-stock the user fills in.
type ReviewProduct = GenProductWithPar & {
  initialQuantity: string
  purchaseUnit: string
  purchasePackSize: string
  purchasePrice: string
  supplier: string
}

// Where the recipes come from: typed by hand, or pulled from existing menus.
type Mode = 'manual' | 'existing'
type Step = 'input' | 'review'

interface MenuToPantryWizardProps {
  open: boolean
  onClose: () => void
}

export function MenuToPantryWizard({ open, onClose }: MenuToPantryWizardProps) {
  const [mode, setMode] = useState<Mode>('manual')
  const [step, setStep] = useState<Step>('input')
  const firstMenuId = useMemo(uid, [])
  const [menus, setMenus] = useState<Array<EditorMenu>>([
    { tempId: firstMenuId, name: '', mealType: 'breakfast', eventTag: '' },
  ])
  const [dishes, setDishes] = useState<Array<EditorDish>>([
    { localId: uid(), menuRef: firstMenuId, name: '', servings: '1', recipe: '' },
  ])
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(new Set())
  const [proposal, setProposal] = useState<PantryProposal | null>(null)
  const [reviewProducts, setReviewProducts] = useState<Array<ReviewProduct>>([])

  const generate = useGeneratePantry()
  const derive = useDerivePantryFromMenus()
  const commit = useCommitPantry()
  const apply = useApplyPantryFromMenus()
  const { data: existingMenus = [], isLoading: menusLoading } = useMenus({ includeInactive: true })

  const reset = () => {
    const id = uid()
    setMode('manual')
    setStep('input')
    setMenus([{ tempId: id, name: '', mealType: 'breakfast', eventTag: '' }])
    setDishes([{ localId: uid(), menuRef: id, name: '', servings: '1', recipe: '' }])
    setSelectedMenuIds(new Set())
    setProposal(null)
    setReviewProducts([])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // ── Manual input mutations ──────────────────────────────────────────────────
  const addMenu = () => {
    const id = uid()
    setMenus((p) => [...p, { tempId: id, name: '', mealType: 'dinner', eventTag: '' }])
    setDishes((p) => [...p, { localId: uid(), menuRef: id, name: '', servings: '1', recipe: '' }])
  }
  const patchMenu = (tempId: string, patch: Partial<EditorMenu>) =>
    setMenus((p) => p.map((m) => (m.tempId === tempId ? { ...m, ...patch } : m)))
  const removeMenu = (tempId: string) => {
    setMenus((p) => p.filter((m) => m.tempId !== tempId))
    setDishes((p) => p.filter((d) => d.menuRef !== tempId))
  }
  const addDish = (menuRef: string) =>
    setDishes((p) => [...p, { localId: uid(), menuRef, name: '', servings: '1', recipe: '' }])
  const patchDish = (localId: string, patch: Partial<EditorDish>) =>
    setDishes((p) => p.map((d) => (d.localId === localId ? { ...d, ...patch } : d)))
  const removeDish = (localId: string) =>
    setDishes((p) => p.filter((d) => d.localId !== localId))

  const hasUsableRecipe = dishes.some((d) => d.name.trim() && d.recipe.trim())

  const toggleMenu = (id: string) =>
    setSelectedMenuIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Build editable review rows from a proposal. `openingDefault` is '0' for new
  // products (manual) and '' for existing (leave current stock untouched).
  const toReview = (p: PantryProposal, openingDefault: string): Array<ReviewProduct> =>
    p.products.map((prod) => ({
      ...prod,
      initialQuantity: openingDefault,
      purchaseUnit: '',
      purchasePackSize: '',
      purchasePrice: '',
      supplier: '',
    }))

  const handleGenerate = () => {
    if (mode === 'manual') {
      generate.mutate(
        {
          menus: menus.map((m) => ({
            tempId: m.tempId,
            name: m.name.trim() || 'Untitled menu',
            mealType: m.mealType,
            eventTag: m.eventTag.trim() || null,
          })),
          dishes: dishes
            .filter((d) => d.name.trim() && d.recipe.trim())
            .map((d) => ({
              menuRef: d.menuRef,
              name: d.name.trim(),
              defaultServingsPerGuest: parseFloat(d.servings) || 1,
              recipe: d.recipe,
            })),
        },
        {
          onSuccess: (p) => {
            setProposal(p)
            setReviewProducts(toReview(p, '0'))
            setStep('review')
          },
        },
      )
    } else {
      derive.mutate(
        { menuIds: [...selectedMenuIds] },
        {
          onSuccess: (p) => {
            setProposal(p)
            setReviewProducts(toReview(p, ''))
            setStep('review')
          },
        },
      )
    }
  }

  // ── Review-step live par ────────────────────────────────────────────────────
  const parByKey = useMemo(() => {
    if (!proposal) return new Map<string, number>()
    return deriveParByProduct(reviewProducts, proposal.dishes)
  }, [reviewProducts, proposal])

  const patchProduct = (tempKey: string, patch: Partial<ReviewProduct>) =>
    setReviewProducts((p) => p.map((r) => (r.tempKey === tempKey ? { ...r, ...patch } : r)))

  const numOrNull = (s: string): number | null => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }

  const handleCommit = () => {
    if (!proposal) return
    if (mode === 'manual') {
      commit.mutate(
        {
          menus: menus.map((m) => ({
            tempId: m.tempId,
            name: m.name.trim() || 'Untitled menu',
            mealType: m.mealType,
            eventTag: m.eventTag.trim() || null,
          })),
          products: reviewProducts.map((r) => ({
            tempKey: r.tempKey,
            name: r.name,
            category: r.category,
            stockUnit: r.stockUnit,
            baseUnit: r.baseUnit ?? null,
            baseUnitsPerStock: r.baseUnitsPerStock ?? null,
            servingUnit: r.servingUnit ?? null,
            servingSize: r.servingSize ?? null,
            purchaseUnit: r.purchaseUnit.trim() || null,
            purchasePackSize: numOrNull(r.purchasePackSize),
            purchasePrice: numOrNull(r.purchasePrice),
            supplier: r.supplier.trim() || null,
            initialQuantity: numOrNull(r.initialQuantity) ?? 0,
          })),
          dishes: proposal.dishes,
        },
        { onSuccess: handleClose },
      )
    } else {
      apply.mutate(
        {
          items: reviewProducts.map((r) => ({
            productId: r.tempKey,
            category: r.category,
            stockUnit: r.stockUnit,
            baseUnit: r.baseUnit ?? null,
            baseUnitsPerStock: r.baseUnitsPerStock ?? null,
            servingUnit: r.servingUnit ?? null,
            servingSize: r.servingSize ?? null,
            parPerGuestStock: parByKey.get(r.tempKey) ?? 0,
            purchaseUnit: r.purchaseUnit.trim() || null,
            purchasePackSize: numOrNull(r.purchasePackSize),
            purchasePrice: numOrNull(r.purchasePrice),
            supplier: r.supplier.trim() || null,
            // Blank opening qty = leave current stock; a number overwrites it.
            initialQuantity: r.initialQuantity.trim() === '' ? null : numOrNull(r.initialQuantity),
          })),
        },
        { onSuccess: handleClose },
      )
    }
  }

  const generating = generate.isPending || derive.isPending
  const committing = commit.isPending || apply.isPending
  const canGenerate = mode === 'manual' ? hasUsableRecipe : selectedMenuIds.size > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl! w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotepadText className="h-5 w-5 text-amber-500" />
            Generate pantry from menus
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'Build your pantry from recipes — type them in, or pull from menus you already have. Procly consolidates the ingredients and derives a starting par-per-guest from your portions.'
              : mode === 'manual'
                ? 'Review the generated products. Par-per-guest is derived from your recipes — add opening stock and pricing, then create.'
                : 'Review the products from your menus. Par-per-guest is derived from their recipes — adjust pricing/stock (leave opening qty blank to keep current), then update.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-5">
            {/* Source toggle */}
            <div className="inline-flex rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  mode === 'manual'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Type recipes
              </button>
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  mode === 'existing'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                From existing menus
              </button>
            </div>

            {mode === 'manual' ? (
              <MenuRecipeEditor
                menus={menus}
                dishes={dishes}
                patchMenu={patchMenu}
                removeMenu={removeMenu}
                addMenu={addMenu}
                addDish={addDish}
                patchDish={patchDish}
                removeDish={removeDish}
              />
            ) : (
              <div className="space-y-2">
                {menusLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading menus…
                  </div>
                ) : existingMenus.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No menus yet. Add one with “Add Menu with Procly” on the Menus page, or switch to
                    “Type recipes”.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Select the menus to build your pantry from.
                    </p>
                    <div className="space-y-2">
                      {existingMenus.map((m) => {
                        const selected = selectedMenuIds.has(m.id)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMenu(m.id)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md border p-3 text-left transition',
                              selected ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                selected && 'border-primary bg-primary text-primary-foreground',
                              )}
                            >
                              {selected && <Check className="h-3 w-3" />}
                            </span>
                            <span className="font-medium">{m.name}</span>
                            <Badge variant="secondary" className="ml-auto capitalize">
                              {m.mealType}
                            </Badge>
                            {m.eventTag && (
                              <Badge variant="outline" className="capitalize">
                                {m.eventTag}
                              </Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="gap-2">
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <NotepadText className="h-4 w-4" />
                )}
                {generating ? 'Generating…' : 'Generate pantry'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{reviewProducts.length} products</span>{' '}
              derived from {proposal?.dishes.length ?? 0} dishes. Par-per-guest (in stock units) is
              computed from the recipes and stored as a low-confidence estimate that improves as the
              kitchen reconciles real usage.
            </p>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Category</th>
                    <th className="px-2 py-2 font-semibold">Stock unit</th>
                    <th className="px-2 py-2 font-semibold">Base unit</th>
                    <th className="px-2 py-2 font-semibold">Base / stock</th>
                    <th className="px-2 py-2 font-semibold">Par/guest</th>
                    <th className="px-2 py-2 font-semibold">Opening qty</th>
                    <th className="px-2 py-2 font-semibold">Buy unit</th>
                    <th className="px-2 py-2 font-semibold">Pack</th>
                    <th className="px-2 py-2 font-semibold">Buy price</th>
                    <th className="px-2 py-2 font-semibold">Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewProducts.map((r) => (
                    <tr key={r.tempKey} className="border-t">
                      <td className="px-1 py-1">
                        <Input
                          value={r.name}
                          className="h-8 min-w-[8rem]"
                          onChange={(e) => patchProduct(r.tempKey, { name: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={r.category}
                          className="h-8 min-w-[7rem]"
                          onChange={(e) => patchProduct(r.tempKey, { category: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={r.stockUnit}
                          className="h-8 w-20"
                          onChange={(e) => patchProduct(r.tempKey, { stockUnit: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={r.baseUnit ?? ''}
                          className="h-8 w-16"
                          placeholder="—"
                          onChange={(e) =>
                            patchProduct(r.tempKey, { baseUnit: e.target.value || null })
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={r.baseUnitsPerStock ?? ''}
                          className="h-8 w-20"
                          placeholder="—"
                          onChange={(e) =>
                            patchProduct(r.tempKey, { baseUnitsPerStock: numOrNull(e.target.value) })
                          }
                        />
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-amber-700">
                        {(parByKey.get(r.tempKey) ?? 0).toFixed(3)} {r.stockUnit}
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={r.initialQuantity}
                          className="h-8 w-20"
                          placeholder={mode === 'existing' ? 'keep' : undefined}
                          onChange={(e) =>
                            patchProduct(r.tempKey, { initialQuantity: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={r.purchaseUnit}
                          className="h-8 w-20"
                          placeholder="—"
                          onChange={(e) => patchProduct(r.tempKey, { purchaseUnit: e.target.value })}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={r.purchasePackSize}
                          className="h-8 w-16"
                          placeholder="—"
                          onChange={(e) =>
                            patchProduct(r.tempKey, { purchasePackSize: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          type="number"
                          value={r.purchasePrice}
                          className="h-8 w-20"
                          placeholder="—"
                          onChange={(e) =>
                            patchProduct(r.tempKey, { purchasePrice: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={r.supplier}
                          className="h-8 min-w-[8rem]"
                          placeholder="—"
                          onChange={(e) => patchProduct(r.tempKey, { supplier: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="ghost" className="gap-1" onClick={() => setStep('input')}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleCommit} disabled={committing} className="gap-2">
                  {committing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {committing
                    ? mode === 'manual'
                      ? 'Creating…'
                      : 'Updating…'
                    : mode === 'manual'
                      ? `Create ${reviewProducts.length} products`
                      : `Update ${reviewProducts.length} products`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
