import { useEffect, useState } from 'react'
import { Trash2, Save, X, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IngredientPicker, type PickableProduct } from './ingredient-picker'
import {
  useUpdateDish,
  useDeleteDish,
  useSetDishIngredients,
} from '@/hooks/use-menus'

type Unit = 'stock' | 'base' | 'serving'

type Ingredient = {
  id?: string
  productId: string
  productName: string
  productStockUnit: string
  productBaseUnit: string | null
  productServingUnit: string | null
  quantityPerServing: string
  unit: Unit
  isSubstitutable: boolean
}

export type DishWithIngredients = {
  id: string
  name: string
  description: string | null
  defaultServingsPerGuest: string
  ingredients: Array<{
    id: string
    productId: string
    productName: string | null
    productStockUnit: string | null
    productBaseUnit: string | null
    productServingUnit: string | null
    quantityPerServing: string
    unit: string
    isSubstitutable: boolean
  }>
}

interface DishEditorProps {
  dish: DishWithIngredients
}

export function DishEditor({ dish }: DishEditorProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(dish.name)
  const [description, setDescription] = useState(dish.description ?? '')
  const [servings, setServings] = useState(dish.defaultServingsPerGuest)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])

  useEffect(() => {
    setName(dish.name)
    setDescription(dish.description ?? '')
    setServings(dish.defaultServingsPerGuest)
    setIngredients(
      dish.ingredients.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName ?? '(unknown)',
        productStockUnit: i.productStockUnit ?? '',
        productBaseUnit: i.productBaseUnit,
        productServingUnit: i.productServingUnit,
        quantityPerServing: i.quantityPerServing,
        unit: (i.unit as Unit) ?? 'base',
        isSubstitutable: i.isSubstitutable,
      })),
    )
  }, [dish])

  const updateDish = useUpdateDish()
  const deleteDish = useDeleteDish()
  const setRecipe = useSetDishIngredients()
  const isSaving = updateDish.isPending || setRecipe.isPending

  const addIngredient = (p: PickableProduct) => {
    setIngredients((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        productStockUnit: p.stockUnit,
        productBaseUnit: p.baseUnit,
        productServingUnit: p.servingUnit,
        quantityPerServing: '',
        // Default to base when available, else stock
        unit: p.baseUnit ? 'base' : 'stock',
        isSubstitutable: false,
      },
    ])
  }

  const updateIngredient = (idx: number, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)))
  }

  const removeIngredient = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    const servingsNum = parseFloat(servings) || 1

    await updateDish.mutateAsync({
      dishId: dish.id,
      name: trimmedName,
      description: description.trim() || null,
      defaultServingsPerGuest: servingsNum,
    })

    const cleaned = ingredients
      .filter((ing) => ing.productId && parseFloat(ing.quantityPerServing) > 0)
      .map((ing) => ({
        productId: ing.productId,
        quantityPerServing: parseFloat(ing.quantityPerServing),
        unit: ing.unit,
        isSubstitutable: ing.isSubstitutable,
      }))

    await setRecipe.mutateAsync({ dishId: dish.id, ingredients: cleaned })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete dish "${dish.name}"? This also removes its recipe.`)) return
    await deleteDish.mutateAsync(dish.id)
  }

  if (!editing) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{dish.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {parseFloat(dish.defaultServingsPerGuest)} serving{parseFloat(dish.defaultServingsPerGuest) === 1 ? '' : 's'}/guest
              </Badge>
            </div>
            {dish.description && (
              <p className="mt-1 text-sm text-muted-foreground">{dish.description}</p>
            )}
            {dish.ingredients.length === 0 ? (
              <p className="mt-3 text-sm text-amber-700">
                No recipe yet — the AI can't compute issuance for this dish without it.
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {dish.ingredients.map((ing) => {
                  const unit =
                    ing.unit === 'base' && ing.productBaseUnit
                      ? ing.productBaseUnit
                      : ing.unit === 'serving' && ing.productServingUnit
                        ? ing.productServingUnit
                        : ing.productStockUnit
                  return (
                    <li key={ing.id} className="text-sm flex items-baseline gap-2">
                      <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                        {parseFloat(ing.quantityPerServing)} {unit}
                      </span>
                      <span>{ing.productName ?? '(unknown)'}</span>
                      {ing.isSubstitutable && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          substitutable
                        </Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`dish-name-${dish.id}`}>Dish name</Label>
          <Input
            id={`dish-name-${dish.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`dish-servings-${dish.id}`}>Servings / guest</Label>
          <Input
            id={`dish-servings-${dish.id}`}
            type="number"
            step="0.1"
            min="0"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`dish-desc-${dish.id}`}>Description (chef/guest-facing)</Label>
        <Textarea
          id={`dish-desc-${dish.id}`}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 200g sirloin steak cooked to perfection with chips and salad."
        />
      </div>

      <div className="space-y-2">
        <Label>Recipe ingredients</Label>
        {ingredients.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add at least one ingredient so the AI can compute issuance.
          </p>
        )}
        {ingredients.map((ing, idx) => (
          <div
            key={ing.id ?? `new-${idx}`}
            className="grid gap-2 sm:grid-cols-[1fr_100px_120px_auto] items-center rounded border p-2"
          >
            <div>
              <p className="text-sm font-medium">{ing.productName}</p>
              {ing.isSubstitutable && (
                <p className="text-[10px] text-muted-foreground">substitutable</p>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={ing.quantityPerServing}
              onChange={(e) => updateIngredient(idx, { quantityPerServing: e.target.value })}
              placeholder="Qty"
            />
            <Select
              value={ing.unit}
              onValueChange={(v) => updateIngredient(idx, { unit: v as Unit })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">{ing.productStockUnit} (stock)</SelectItem>
                {ing.productBaseUnit && (
                  <SelectItem value="base">{ing.productBaseUnit} (base)</SelectItem>
                )}
                {ing.productServingUnit && (
                  <SelectItem value="serving">{ing.productServingUnit} (serving)</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeIngredient(idx)}
              aria-label="Remove ingredient"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="sm:col-span-4 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id={`sub-${dish.id}-${idx}`}
                className="h-3.5 w-3.5"
                checked={ing.isSubstitutable}
                onChange={(e) => updateIngredient(idx, { isSubstitutable: e.target.checked })}
              />
              <label htmlFor={`sub-${dish.id}-${idx}`} className="text-xs text-muted-foreground">
                Chef may substitute this ingredient
              </label>
            </div>
          </div>
        ))}

        <IngredientPicker
          excludeProductIds={ingredients.map((i) => i.productId)}
          onPick={addIngredient}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700"
          onClick={handleDelete}
          disabled={deleteDish.isPending}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete dish
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !name.trim()}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving…' : 'Save dish'}
          </Button>
        </div>
      </div>
    </div>
  )
}
