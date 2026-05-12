import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { MODEL } from '@/server/ai/constants'
import { SYSTEM_PROMPT } from '@/server/ai/system-prompt'
import { createTools } from '@/server/ai/tool-implementations'
import { getAuthContext } from '@/server/auth/context'

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

        console.log('[ai-chat] body keys:', Object.keys(body))
        console.log('[ai-chat] branchId:', body.branchId)
        console.log(
          '[ai-chat] messages count:',
          Array.isArray(body.messages) ? body.messages.length : 'not array',
        )
        if (Array.isArray(body.messages) && body.messages[0]) {
          console.log('[ai-chat] first message keys:', Object.keys(body.messages[0] as object))
        }

        const messages = body.messages as Array<Record<string, unknown>>
        // branchId/context come from fetchServerSentEvents body spread
        const branchId = (body.branchId ?? '') as string
        const context = body.context as {
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

        if (!branchId) {
          console.warn('[ai-chat] No branchId provided, tools may fail')
        }

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

        // Get authenticated user for tool operations (e.g. creating lists)
        let userId: string | undefined
        try {
          const authCtx = await getAuthContext()
          userId = authCtx.userId
        } catch {
          // Allow unauthenticated access for read-only tools
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
