import { createServerFn } from '@tanstack/react-start'
import { chat, maxIterations } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import type { ContentPart } from '@tanstack/ai'
import type { MenuDraft } from '@/lib/menu-extract'
import { coerceMenuDraft } from '@/lib/menu-extract'
import { getAuthContext, requireRole } from '@/server/auth/context'
import { VISION_MODEL } from '@/server/ai/constants'
import { parseAIError } from '@/server/ai/errors'
import { MENU_EXTRACT_SYSTEM_PROMPT } from '@/server/ai/menu-extract/system-prompt'
import { createMenuExtractTools } from '@/server/ai/menu-extract/tool-implementations'

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
          'Read the attached menu image(s) and call propose_menu_draft exactly once with every menu and dish you can see.',
      },
      ...images.map(
        (img): ContentPart => ({
          type: 'image',
          source: { type: 'data', value: img.data, mimeType: img.mimeType },
        }),
      ),
    ]

    const tools = createMenuExtractTools()

    try {
      const stream = chat({
        adapter: openRouterText(VISION_MODEL),
        systemPrompts: [MENU_EXTRACT_SYSTEM_PROMPT],
        // VISION_MODEL is an env-driven cast (see constants.ts), so the adapter's
        // input modalities can't be statically narrowed to include `image`. The
        // runtime shape (text + image data parts) is exactly what the openrouter
        // adapter maps to image_url, so cast past the over-strict content type.
        messages: [{ role: 'user', content: content as never }],
        tools,
        agentLoopStrategy: maxIterations(3),
      })

      let draft: MenuDraft | null = null
      let runError: unknown = null

      for await (const chunk of stream) {
        if (chunk.type === 'RUN_ERROR') runError = chunk
        if (chunk.type === 'TOOL_RESULT') {
          const result = chunk.result as Record<string, unknown> | null
          if (result && result.accepted) {
            draft = coerceMenuDraft(result)
          }
        }
      }

      // A provider error (rate limit, outage, …) arrives as a RUN_ERROR chunk,
      // not a throw — surface it accurately instead of blaming the image.
      if (runError) throw new Error(parseAIError(runError))

      if (!draft || draft.menus.length === 0) {
        throw new Error(
          "Couldn't read a menu from that image — try a clearer photo, or enter the menu manually.",
        )
      }

      return draft
    } catch (err) {
      throw new Error(parseAIError(err))
    }
  })
