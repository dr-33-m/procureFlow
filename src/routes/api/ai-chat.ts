import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { MODEL } from '@/server/ai/constants'
import { SYSTEM_PROMPT } from '@/server/ai/system-prompt'
import { createTools } from '@/server/ai/tool-implementations'
import { getAuthContext, validateBranchAccess } from '@/server/auth/context'

export const Route = createFileRoute('/api/ai-chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>
        try {
          body = await request.json()
        } catch (e) {
          console.error('[ai-chat] Failed to parse body:', e)
          return Response.json(
            { error: 'Invalid JSON body' },
            { status: 400 },
          )
        }

        const messages = body.messages as Array<Record<string, unknown>>

        // The @tanstack/ai-client SSE adapter nests the connection's custom
        // `body` under `forwardedProps` (mirrored as `data`), NOT at the top
        // level — only `messages` is written top-level. Read from there.
        const fwd = (body.forwardedProps ?? body.data ?? {}) as Record<
          string,
          unknown
        >
        const context = (fwd.context ?? body.context) as {
          existingItems?: Array<{
            productId: string
            productName: string
            quantity: number
          }>
          periodType?: string
          periodDays?: number
          expectedGuestCount?: number
          mealsPerDay?: number
          avgDailyGuests?: number
        } | undefined

        // Get authenticated user for tool operations (e.g. creating lists) and
        // to resolve/authorize the branch server-side.
        const authCtx = await getAuthContext().catch(() => null)
        const userId = authCtx?.userId

        // Prefer the client-selected branch, fall back to the user's default.
        let branchId = (fwd.branchId ?? body.branchId ?? '') as string
        if (!branchId) branchId = authCtx?.defaultBranchId ?? ''

        if (!branchId) {
          return Response.json(
            { error: 'No branch selected' },
            { status: 400 },
          )
        }

        // Authorize the branch when we have an authenticated user.
        if (authCtx) {
          try {
            await validateBranchAccess(authCtx, branchId)
          } catch {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }
        }

        console.log('[ai-chat] resolved branchId:', branchId)

        // Build system prompts array
        const systemPrompts: string[] = [SYSTEM_PROMPT]

        // Inject editor context as an additional system prompt
        if (context) {
          const contextParts: string[] = []
          if (context.expectedGuestCount)
            contextParts.push(
              `Expected guest count: ${context.expectedGuestCount}`,
            )
          if (context.periodDays)
            contextParts.push(`Period: ${context.periodDays} days`)
          if (context.periodType)
            contextParts.push(`Period type: ${context.periodType}`)
          if (context.mealsPerDay)
            contextParts.push(`Meals per day: ${context.mealsPerDay}`)
          if (context.avgDailyGuests)
            contextParts.push(`Avg daily guests: ${context.avgDailyGuests}`)
          if (context.existingItems && context.existingItems.length > 0) {
            contextParts.push(
              `Items already in the shopping list:\n${context.existingItems.map((i) => `- ${i.productName}: ${i.quantity}`).join('\n')}`,
            )
          }
          if (contextParts.length > 0) {
            systemPrompts.push(
              `Current editor context:\n${contextParts.join('\n')}`,
            )
          }
        }

        const tools = createTools(branchId, userId)

        // Pass UIMessages directly to chat() — it handles conversion
        // from UIMessages (with parts) to ModelMessages internally
        const stream = chat({
          adapter: openRouterText(MODEL),
          systemPrompts,
          messages: messages as any,
          tools,
          agentLoopStrategy: maxIterations(10),
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})
