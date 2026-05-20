import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { MODEL } from '@/server/ai/constants'
import { KITCHEN_SYSTEM_PROMPT } from '@/server/ai/kitchen/system-prompt'
import { createKitchenTools } from '@/server/ai/kitchen/tool-implementations'
import { getAuthContext } from '@/server/auth/context'

export const Route = createFileRoute('/api/ai-kitchen')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, unknown>
        try {
          body = await request.json()
        } catch (e) {
          console.error('[ai-kitchen] Failed to parse body:', e)
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const messages = body.messages as Array<Record<string, unknown>>
        const branchId = (body.branchId ?? '') as string

        try {
          const auth = await getAuthContext()
          if (!['owner', 'admin', 'chef'].includes(auth.userRole)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 })
          }
        } catch {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const tools = createKitchenTools(branchId)

        const stream = chat({
          adapter: openRouterText(MODEL),
          systemPrompts: [KITCHEN_SYSTEM_PROMPT],
          messages: messages as any,
          tools,
          agentLoopStrategy: maxIterations(12),
        })

        return toServerSentEventsResponse(stream)
      },
    },
  },
})
