// Shared shapes + helpers for the "Add Menu with Procly" image extractor.
//
// Imported by BOTH the server (the extract server fn) and the client (the upload
// step in the wizard), so it must stay dependency-free — no DB, no server-only
// imports (same rule as pantry-gen.ts). The vision model reads a menu image into
// the SAME editable draft the wizard already understands: menus + dishes with a
// free-text recipe, which then flows through generatePantryFromMenus unchanged.

import type { MealType, WizardDishInput, WizardMenuInput } from '@/lib/pantry-gen'

// What the upload step ultimately seeds into the wizard's input state.
export type MenuDraft = {
  menus: Array<WizardMenuInput>
  dishes: Array<WizardDishInput>
}

// ─── Client upload guards ────────────────────────────────────────────────────
// Only formats the installed OpenRouter adapter maps to image_url cleanly.
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB per image
export const MAX_IMAGES = 5 // base64 rides in the JSON server-fn body; keep bounded

const MEAL_TYPES: Array<MealType> = ['breakfast', 'lunch', 'dinner', 'drinks', 'event']

// Read a File into a raw base64 string (no `data:…;base64,` prefix), the shape
// the multimodal `image` content part's data source expects. Browser-only.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// Coerce the (untrusted) AI tool result into a MenuDraft. The model can emit
// partial/loose JSON; malformed rows are dropped here so the wizard's editable
// draft surfaces the gaps rather than crashing. Accepts either dish.ingredients
// (string[]) or a pre-joined dish.recipe string.
export function coerceMenuDraft(raw: Record<string, unknown>): MenuDraft {
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const num = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
    return Number.isFinite(n) ? n : null
  }
  const mealType = (v: unknown): MealType => {
    const s = str(v).toLowerCase()
    return MEAL_TYPES.includes(s as MealType) ? (s as MealType) : 'lunch'
  }

  const menus: Array<WizardMenuInput> = (Array.isArray(raw.menus) ? raw.menus : [])
    .map((m: unknown, i: number) => {
      const mm = (m ?? {}) as Record<string, unknown>
      const name = str(mm.name)
      const tempId =
        str(mm.tempId) ||
        (name ? name.toLowerCase().replace(/\s+/g, '-') : `menu-${i + 1}`)
      return {
        tempId,
        name: name || `Menu ${i + 1}`,
        mealType: mealType(mm.mealType),
        eventTag: str(mm.eventTag) || null,
      }
    })
    .filter((m) => m.tempId)

  // If the model gave dishes but no menus, synthesize one so dishes have a home.
  if (menus.length === 0 && Array.isArray(raw.dishes) && raw.dishes.length > 0) {
    menus.push({ tempId: 'menu-1', name: 'Menu 1', mealType: 'lunch', eventTag: null })
  }

  const menuIds = new Set(menus.map((m) => m.tempId))
  const fallbackMenuRef = menus[0]?.tempId ?? ''

  const dishes: Array<WizardDishInput> = (Array.isArray(raw.dishes) ? raw.dishes : [])
    .map((d: unknown) => {
      const dd = (d ?? {}) as Record<string, unknown>
      let menuRef = str(dd.menuRef)
      if (!menuIds.has(menuRef)) menuRef = fallbackMenuRef
      const recipe = Array.isArray(dd.ingredients)
        ? dd.ingredients.map((x: unknown) => str(x)).filter(Boolean).join('\n')
        : str(dd.recipe)
      return {
        menuRef,
        name: str(dd.name),
        defaultServingsPerGuest: num(dd.defaultServingsPerGuest) ?? 1,
        recipe,
      }
    })
    .filter((d) => d.name && d.menuRef)

  return { menus, dishes }
}
