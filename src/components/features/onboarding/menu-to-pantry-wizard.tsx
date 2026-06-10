import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Loader2, NotepadText, Plus, Trash2 } from 'lucide-react'
import type {GenProductWithPar, MealType, PantryProposal} from '@/lib/pantry-gen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCommitPantry, useGeneratePantry } from '@/hooks/use-ai-pantry-gen'
import {
  
  
  
  deriveParByProduct
} from '@/lib/pantry-gen'

const MEAL_TYPES: Array<MealType> = ['breakfast', 'lunch', 'dinner', 'drinks', 'event']

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

type WizMenu = { tempId: string; name: string; mealType: MealType; eventTag: string }
type WizDish = { localId: string; menuRef: string; name: string; servings: string; recipe: string }

// Review row: the AI product spec + the pricing/opening-stock the user fills in.
type ReviewProduct = GenProductWithPar & {
  initialQuantity: string
  purchaseUnit: string
  purchasePackSize: string
  purchasePrice: string
  supplier: string
}

interface MenuToPantryWizardProps {
  open: boolean
  onClose: () => void
}

export function MenuToPantryWizard({ open, onClose }: MenuToPantryWizardProps) {
  const [step, setStep] = useState<'input' | 'review'>('input')
  const firstMenuId = useMemo(uid, [])
  const [menus, setMenus] = useState<Array<WizMenu>>([
    { tempId: firstMenuId, name: '', mealType: 'breakfast', eventTag: '' },
  ])
  const [dishes, setDishes] = useState<Array<WizDish>>([
    { localId: uid(), menuRef: firstMenuId, name: '', servings: '1', recipe: '' },
  ])
  const [proposal, setProposal] = useState<PantryProposal | null>(null)
  const [reviewProducts, setReviewProducts] = useState<Array<ReviewProduct>>([])

  const generate = useGeneratePantry()
  const commit = useCommitPantry()

  const reset = () => {
    const id = uid()
    setStep('input')
    setMenus([{ tempId: id, name: '', mealType: 'breakfast', eventTag: '' }])
    setDishes([{ localId: uid(), menuRef: id, name: '', servings: '1', recipe: '' }])
    setProposal(null)
    setReviewProducts([])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // ── Input-step mutations ────────────────────────────────────────────────────
  const addMenu = () => {
    const id = uid()
    setMenus((p) => [...p, { tempId: id, name: '', mealType: 'dinner', eventTag: '' }])
    setDishes((p) => [...p, { localId: uid(), menuRef: id, name: '', servings: '1', recipe: '' }])
  }
  const patchMenu = (tempId: string, patch: Partial<WizMenu>) =>
    setMenus((p) => p.map((m) => (m.tempId === tempId ? { ...m, ...patch } : m)))
  const removeMenu = (tempId: string) => {
    setMenus((p) => p.filter((m) => m.tempId !== tempId))
    setDishes((p) => p.filter((d) => d.menuRef !== tempId))
  }
  const addDish = (menuRef: string) =>
    setDishes((p) => [...p, { localId: uid(), menuRef, name: '', servings: '1', recipe: '' }])
  const patchDish = (localId: string, patch: Partial<WizDish>) =>
    setDishes((p) => p.map((d) => (d.localId === localId ? { ...d, ...patch } : d)))
  const removeDish = (localId: string) =>
    setDishes((p) => p.filter((d) => d.localId !== localId))

  const hasUsableRecipe = dishes.some((d) => d.name.trim() && d.recipe.trim())

  const handleGenerate = () => {
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
          setReviewProducts(
            p.products.map((prod) => ({
              ...prod,
              initialQuantity: '0',
              purchaseUnit: '',
              purchasePackSize: '',
              purchasePrice: '',
              supplier: '',
            })),
          )
          setStep('review')
        },
      },
    )
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
  }

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
              ? 'Enter your menus and recipes. Procly consolidates the ingredients into a pantry and derives a starting par-per-guest from your portions.'
              : 'Review the generated products. Par-per-guest is derived from your recipes — add opening stock and pricing, then create.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-5">
            {menus.map((menu) => (
              <div key={menu.tempId} className="rounded-lg border p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] items-end">
                  <div className="space-y-1.5">
                    <Label>Menu name</Label>
                    <Input
                      value={menu.name}
                      placeholder="e.g. Breakfast Buffet"
                      onChange={(e) => patchMenu(menu.tempId, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Meal type</Label>
                    <Select
                      value={menu.mealType}
                      onValueChange={(v) => patchMenu(menu.tempId, { mealType: v as MealType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map((mt) => (
                          <SelectItem key={mt} value={mt} className="capitalize">
                            {mt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Event tag (optional)</Label>
                    <Input
                      value={menu.eventTag}
                      placeholder="e.g. wedding"
                      onChange={(e) => patchMenu(menu.tempId, { eventTag: e.target.value })}
                    />
                  </div>
                  {menus.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMenu(menu.tempId)}
                      aria-label="Remove menu"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3 pl-1">
                  {dishes
                    .filter((d) => d.menuRef === menu.tempId)
                    .map((dish) => (
                      <div key={dish.localId} className="rounded border bg-muted/30 p-3 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] items-end">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Dish name</Label>
                            <Input
                              value={dish.name}
                              placeholder="e.g. Full English"
                              onChange={(e) => patchDish(dish.localId, { name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Servings / guest</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={dish.servings}
                              onChange={(e) => patchDish(dish.localId, { servings: e.target.value })}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDish(dish.localId)}
                            aria-label="Remove dish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Recipe — one ingredient per line</Label>
                          <Textarea
                            rows={4}
                            value={dish.recipe}
                            placeholder={'180g chicken breast\n15ml olive oil\n2 eggs\n1 slice bread'}
                            className="font-mono text-sm"
                            onChange={(e) => patchDish(dish.localId, { recipe: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => addDish(menu.tempId)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add dish
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" className="gap-1" onClick={addMenu}>
              <Plus className="h-4 w-4" />
              Add menu
            </Button>

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!hasUsableRecipe || generate.isPending} className="gap-2">
                {generate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <NotepadText className="h-4 w-4" />
                )}
                {generate.isPending ? 'Generating…' : 'Generate pantry'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{reviewProducts.length} products</span>{' '}
              derived from {proposal?.dishes.length ?? 0} dishes. Par-per-guest (in stock units) is
              computed from your recipes and stored as a low-confidence estimate that improves as the
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
                Back to recipes
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleCommit} disabled={commit.isPending} className="gap-2">
                  {commit.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {commit.isPending ? 'Creating…' : `Create ${reviewProducts.length} products`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
