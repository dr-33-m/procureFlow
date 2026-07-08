import { createServerFn } from '@tanstack/react-start'
import { chat } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { z } from 'zod'
import type { ContentPart } from '@tanstack/ai'
import type { MenuDraft } from '@/lib/menu-extract'
import { coerceMenuDraft } from '@/lib/menu-extract'
import { getAuthContext, requireRole } from '@/server/auth/context'
import { VISION_MODEL } from '@/server/ai/constants'
import { parseAIError } from '@/server/ai/errors'
import { MENU_EXTRACT_SYSTEM_PROMPT } from '@/server/ai/menu-extract/system-prompt'

const MenuExtractOutputSchema = z.object({
  menus: z.array(
    z.object({
      tempId: z.string(),
      name: z.string(),
      mealType: z.enum(['breakfast', 'lunch', 'dinner', 'drinks', 'event']),
      eventTag: z.string().nullable().optional(),
    }),
  ),
  dishes: z.array(
    z.object({
      menuRef: z.string(),
      name: z.string(),
      defaultServingsPerGuest: z.number().optional().default(1),
      ingredients: z.array(z.string()).optional().default([]),
      recipe: z.string().optional(),
    }),
  ),
})

// Read menu image(s) into an editable menu/dish/recipe draft. One-shot, non-
// streaming, no DB writes: the user reviews the draft, fills in quantities the
// printed menu lacked, then the existing generate + commit pipeline persists.
// Images arrive as base64 in the JSON body (createServerFn is JSON-only); the
// installed openrouter adapter maps `image` data-source parts to image_url.
export const extractMenuFromImages = createServerFn({ method: 'POST' })
  .inputValidator((data: { images: Array<{ data: string; mimeType: string }> }) => data)
  .handler(async ({ data }): Promise<MenuDraft> => {
    const ctx = await getAuthContext()
    requireRole(ctx, 'owner', 'admin')

    const images = data.images.filter((i) => i.data && i.mimeType)
    if (images.length === 0) {
      throw new Error('Add at least one menu image before extracting.')
    }

    const content: Array<ContentPart> = [
      {
        type: 'text',
        content:
          'Read the attached menu image(s) and return every menu and dish you can see.',
      },
      ...images.map(
        (img): ContentPart => ({
          type: 'image',
          source: { type: 'data', value: img.data, mimeType: img.mimeType },
          metadata: { detail: 'high' },
        }),
      ),
    ]

    try {
      const result = await chat({
        adapter: openRouterText(VISION_MODEL),
        systemPrompts: [MENU_EXTRACT_SYSTEM_PROMPT],
        // VISION_MODEL is an env-driven cast (see constants.ts), so the adapter's
        // input modalities can't be statically narrowed to include `image`. The
        // runtime shape (text + image data parts) is exactly what the openrouter
        // adapter maps to image_url, so cast past the over-strict content type.
        messages: [{ role: 'user', content: content as never }],
        outputSchema: MenuExtractOutputSchema,
        modelOptions: { maxCompletionTokens: 4096 } as never,
      })

      const draft = coerceMenuDraft(result as Record<string, unknown>)

      if (draft.menus.length === 0) {
        throw new Error(
          "Couldn't read a menu from that image — try a clearer photo, or enter the menu manually.",
        )
      }

      return draft
    } catch (err) {
      throw new Error(parseAIError(err))
    }
  })
