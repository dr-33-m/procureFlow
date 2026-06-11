import { Plus, Trash2 } from 'lucide-react'
import type { MealType } from '@/lib/pantry-gen'
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

const MEAL_TYPES: Array<MealType> = ['breakfast', 'lunch', 'dinner', 'drinks', 'event']

// Shared editable shapes for menus + dishes with free-text recipes. Used by both
// the pantry generator (manual recipe entry) and "Add Menu with Procly".
export type EditorMenu = { tempId: string; name: string; mealType: MealType; eventTag: string }
export type EditorDish = {
  localId: string
  menuRef: string
  name: string
  servings: string
  recipe: string
}

interface MenuRecipeEditorProps {
  menus: Array<EditorMenu>
  dishes: Array<EditorDish>
  patchMenu: (tempId: string, patch: Partial<EditorMenu>) => void
  removeMenu: (tempId: string) => void
  addMenu: () => void
  addDish: (menuRef: string) => void
  patchDish: (localId: string, patch: Partial<EditorDish>) => void
  removeDish: (localId: string) => void
}

// The menus → dishes → free-text recipe editor body (no header/footer). Callers
// wrap it with their own dialog chrome and action buttons.
export function MenuRecipeEditor({
  menus,
  dishes,
  patchMenu,
  removeMenu,
  addMenu,
  addDish,
  patchDish,
  removeDish,
}: MenuRecipeEditorProps) {
  return (
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
    </div>
  )
}
