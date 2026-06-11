import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ImagePlus, Loader2, NotepadText, ScanText, X } from 'lucide-react'
import { toast } from 'sonner'
import type {EditorDish, EditorMenu} from '@/components/features/menus/menu-recipe-editor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  
  
  MenuRecipeEditor
} from '@/components/features/menus/menu-recipe-editor'
import { useExtractMenu } from '@/hooks/use-ai-pantry-gen'
import { useCreateMenusFromRecipes } from '@/hooks/use-menus'
import {
  ACCEPTED_IMAGE_ACCEPT,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  fileToBase64,
} from '@/lib/menu-extract'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// One blank menu + dish, with the dish's menuRef matching the menu's tempId.
function blankDraft(): { menus: Array<EditorMenu>; dishes: Array<EditorDish> } {
  const id = uid()
  return {
    menus: [{ tempId: id, name: '', mealType: 'lunch', eventTag: '' }],
    dishes: [{ localId: uid(), menuRef: id, name: '', servings: '1', recipe: '' }],
  }
}

interface AddMenuWizardProps {
  open: boolean
  onClose: () => void
  /** 'upload' (default) opens the image extractor first — "Add Menu with Procly".
   *  'edit' jumps straight to the manual menu/dish editor — the "New Menu" entry,
   *  which creates a menu and its dishes in one go, consistent with the AI flow. */
  startStep?: 'upload' | 'edit'
}

// Add menus to the org: upload menu image(s) for Procly to read into an editable
// menu/dish/recipe draft, or enter them by hand — either way saved as menus +
// dishes + recipes in one go. Pure menu creation: products are created bare to
// hold the recipe ingredients; par-per-guest and pricing are NOT touched here
// (that's the separate pantry "generate from menus" step).
export function AddMenuWizard({ open, onClose, startStep = 'upload' }: AddMenuWizardProps) {
  const [initial] = useState(() =>
    startStep === 'edit'
      ? blankDraft()
      : { menus: [] as Array<EditorMenu>, dishes: [] as Array<EditorDish> },
  )
  const [step, setStep] = useState<'upload' | 'edit'>(startStep)
  const [menus, setMenus] = useState<Array<EditorMenu>>(initial.menus)
  const [dishes, setDishes] = useState<Array<EditorDish>>(initial.dishes)
  const [files, setFiles] = useState<Array<File>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const extract = useExtractMenu()
  const createMenus = useCreateMenusFromRecipes()

  const reset = () => {
    const fresh =
      startStep === 'edit'
        ? blankDraft()
        : { menus: [] as Array<EditorMenu>, dishes: [] as Array<EditorDish> }
    setStep(startStep)
    setMenus(fresh.menus)
    setDishes(fresh.dishes)
    setFiles([])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files],
  )
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])

  const addFiles = (selected: FileList | null) => {
    if (!selected) return
    const next: Array<File> = []
    for (const f of Array.from(selected)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
        toast.error(`${f.name}: unsupported type — use PNG, JPG, WebP or GIF`)
        continue
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: larger than 5MB`)
        continue
      }
      next.push(f)
    }
    setFiles((prev) => [...prev, ...next].slice(0, MAX_IMAGES))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const startBlank = () => {
    const id = uid()
    setMenus([{ tempId: id, name: '', mealType: 'lunch', eventTag: '' }])
    setDishes([{ localId: uid(), menuRef: id, name: '', servings: '1', recipe: '' }])
    setStep('edit')
  }

  const handleExtract = async () => {
    if (files.length === 0) return
    const images = await Promise.all(
      files.map(async (f) => ({ data: await fileToBase64(f), mimeType: f.type })),
    )
    extract.mutate(
      { images },
      {
        onSuccess: (draft) => {
          if (draft.menus.length === 0) return
          setMenus(
            draft.menus.map((m) => ({
              tempId: m.tempId,
              name: m.name,
              mealType: m.mealType,
              eventTag: m.eventTag ?? '',
            })),
          )
          const seeded = draft.dishes.map((d) => ({
            localId: uid(),
            menuRef: d.menuRef,
            name: d.name,
            servings: String(d.defaultServingsPerGuest || 1),
            recipe: d.recipe,
          }))
          setDishes(
            seeded.length > 0
              ? seeded
              : [{ localId: uid(), menuRef: draft.menus[0].tempId, name: '', servings: '1', recipe: '' }],
          )
          setStep('edit')
        },
      },
    )
  }

  // ── Edit-step mutations ───────────────────────────────────────────────────────
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

  const handleSave = () => {
    createMenus.mutate(
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
      { onSuccess: handleClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl! w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {startStep === 'edit' ? (
              <NotepadText className="h-5 w-5 text-amber-500" />
            ) : (
              <ScanText className="h-5 w-5 text-amber-500" />
            )}
            {startStep === 'edit' ? 'New menu' : 'Add menu with Procly'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Upload a photo or screenshot of your menu. Procly reads the dishes and ingredients into an editable draft you can fix before saving.'
              : 'Add menus and their dishes — list each dish’s ingredients (one per line), then save. Quantities and pricing can be set later in the pantry.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_IMAGES}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-10 text-muted-foreground transition hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">
                {files.length >= MAX_IMAGES
                  ? `Maximum ${MAX_IMAGES} images`
                  : 'Click to choose menu image(s)'}
              </span>
              <span className="text-xs">PNG, JPG, WebP or GIF · up to 5MB each · max {MAX_IMAGES}</span>
            </button>

            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map((p, i) => (
                  <div key={p.url} className="group relative overflow-hidden rounded-lg border">
                    <img src={p.url} alt={p.name} className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${p.name}`}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{p.name}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="ghost" onClick={startBlank} disabled={extract.isPending}>
                Enter manually instead
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={extract.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExtract}
                  disabled={files.length === 0 || extract.isPending}
                  className="gap-2"
                >
                  {extract.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanText className="h-4 w-4" />
                  )}
                  {extract.isPending ? 'Reading menu…' : 'Read menu'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
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

            <div className="flex items-center justify-between border-t pt-4">
              {startStep === 'upload' ? (
                <Button variant="ghost" onClick={() => setStep('upload')}>
                  Back to upload
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasUsableRecipe || createMenus.isPending}
                  className="gap-2"
                >
                  {createMenus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {createMenus.isPending ? 'Saving…' : 'Save menus'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
