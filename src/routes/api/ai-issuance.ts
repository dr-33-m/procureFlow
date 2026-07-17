import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { MODEL } from '@/server/ai/constants'
import { ISSUANCE_SYSTEM_PROMPT } from '@/server/ai/issuance/system-prompt'
import { createIssuanceTools } from '@/server/ai/issuance/tool-implementations'
import { getAuthContext } from '@/server/auth/context'

export const Route = createFileRoute('/api/ai-issuance')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>
        try {
          body = await request.json()
        } catch (e) {
          console.error('[ai-issuance] Failed to parse body:', e)
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const messages = body.messages as Array<Record<string, unknown>>

        // The @tanstack/ai-client SSE adapter nests the connection's custom
        // `body` under `forwardedProps` (mirrored as `data`), NOT at the top
        // level — only `messages` is written top-level. Read from there.
        const fwd = (body.forwardedProps ?? body.data ?? {}) as Record<string, unknown>
        const branchId = (fwd.branchId ?? body.branchId ?? '') as string
        const context = (fwd.context ?? body.context) as
          | {
              expectedGuestCount?: number
              days?: number
              mealType?: string
              menuHint?: string
              eventTag?: string
            }
          | undefined

        if (!branchId) {
          console.warn('[ai-issuance] No branchId provided; tools will fail.')
        }

        // Owner/admin only for the issuance agent (chefs work the cart manually
        // and reconcile in Phase 3 via a different agent).
        try {
          const auth = await getAuthContext()
          if (auth.userRole !== 'owner' && auth.userRole !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }
        } catch {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const systemPrompts: string[] = [ISSUANCE_SYSTEM_PROMPT]

        if (context) {
          const parts: string[] = []
          if (context.expectedGuestCount)
            parts.push(`Expected guest count: ${context.expectedGuestCount}`)
          if (context.days) parts.push(`Service duration: ${context.days} day(s)`)
          if (context.mealType) parts.push(`Meal type: ${context.mealType}`)
          if (context.menuHint) parts.push(`Menu hint: ${context.menuHint}`)
          if (context.eventTag) parts.push(`Event tag: ${context.eventTag}`)
          if (parts.length > 0) {
            systemPrompts.push(`Current planning context:\n${parts.join('\n')}`)
          }
        }

        const tools = createIssuanceTools(branchId)

        const stream = chat({
          adapter: openRouterText(MODEL),
          systemPrompts,
          messages: messages as any,
          tools,
          agentLoopStrategy: maxIterations(12),
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})
