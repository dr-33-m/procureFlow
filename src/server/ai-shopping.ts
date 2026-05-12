import { createServerFn } from '@tanstack/react-start'
import { chat, maxIterations } from '@tanstack/ai'
import { openRouterText } from '@tanstack/ai-openrouter'
import { getAuthContext } from '@/server/auth/context'
import { MODEL } from '@/server/ai/constants'
import { SYSTEM_PROMPT } from '@/server/ai/system-prompt'
import { createTools } from '@/server/ai/tool-implementations'
import type {
  AIChatMessage,
  AIToolCallInfo,
  AISuggestedItem,
  AIShoppingListSuggestion,
} from '@/types'

function parseAIError(err: unknown): string {
  if (err instanceof Error) {
    // OpenRouter SDK errors carry statusCode + body with nested error.message
    const statusCode = (err as { statusCode?: number }).statusCode
    const body = (err as { body?: string }).body

    if (body) {
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string; metadata?: { raw?: string } } }
        const raw = parsed.error?.metadata?.raw
        if (raw) return raw
        if (parsed.error?.message) return parsed.error.message
      } catch {
        // body wasn't JSON, fall through
      }
    }

    if (statusCode === 429) return 'AI model is rate-limited. Please wait a moment and try again.'
    if (statusCode === 401) return 'AI API key is invalid or missing.'
    if (statusCode === 402) return 'AI API quota exceeded. Check your OpenRouter billing.'
    if (statusCode === 503) return 'AI model is temporarily unavailable. Try again shortly.'
    if (statusCode) return `AI provider error (${statusCode}): ${err.message}`

    return err.message
  }
  return 'An unexpected error occurred with the AI assistant'
}

export const aiShoppingChat = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      branchId: string
      messages: AIChatMessage[]
      context?: {
        existingItems?: Array<{ productId: string; productName: string; quantity: number }>
        periodType?: string
        periodDays?: number
        expectedGuestCount?: number
        mealsPerDay?: number
        avgDailyGuests?: number
      }
    }) => data,
  )
  .handler(async ({ data }) => {
    await getAuthContext()

    const { branchId, messages, context } = data
    const tools = createTools(branchId)

    // Build the message list with system prompt
    const chatMessages: AIChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }]

    // Inject context as a system message if provided
    if (context) {
      const contextParts: string[] = []
      if (context.expectedGuestCount)
        contextParts.push(`Expected guest count: ${context.expectedGuestCount}`)
      if (context.periodDays) contextParts.push(`Period: ${context.periodDays} days`)
      if (context.periodType) contextParts.push(`Period type: ${context.periodType}`)
      if (context.mealsPerDay) contextParts.push(`Meals per day: ${context.mealsPerDay}`)
      if (context.avgDailyGuests) contextParts.push(`Avg daily guests: ${context.avgDailyGuests}`)
      if (context.existingItems && context.existingItems.length > 0) {
        contextParts.push(
          `Items already in the shopping list:\n${context.existingItems.map((i) => `- ${i.productName}: ${i.quantity}`).join('\n')}`,
        )
      }

      if (contextParts.length > 0) {
        chatMessages.push({
          role: 'system',
          content: `Current editor context:\n${contextParts.join('\n')}`,
        })
      }
    }

    chatMessages.push(...messages)

    // Convert messages for the chat API — system messages become user messages
    // since TanStack AI model messages use 'user' | 'assistant' | 'tool'
    const modelMessages = chatMessages.map((m) => {
      if (m.role === 'system') {
        return { role: 'user' as const, content: `[System Instructions]\n${m.content}` }
      }
      return { role: m.role as 'user' | 'assistant', content: m.content }
    })

    // Run the agentic chat — collect full response
    try {
      const stream = chat({
        adapter: openRouterText(MODEL),
        messages: modelMessages,
        tools,
        agentLoopStrategy: maxIterations(10),
      })

      let responseText = ''
      const toolCalls: AIToolCallInfo[] = []
      let suggestion: AIShoppingListSuggestion | null = null

      // Track in-flight tool calls
      const pendingToolCalls = new Map<string, { name: string; args: string }>()

      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'TEXT_MESSAGE_CONTENT':
            responseText += chunk.delta
            break
          case 'TOOL_CALL_START':
            pendingToolCalls.set(chunk.toolCallId, { name: chunk.toolCallName, args: '' })
            break
          case 'TOOL_CALL_ARGS':
            {
              const pending = pendingToolCalls.get(chunk.toolCallId)
              if (pending) pending.args += chunk.delta
            }
            break
          case 'TOOL_CALL_END': {
            const pending = pendingToolCalls.get(chunk.toolCallId)
            if (pending) {
              let parsedInput: Record<string, unknown> | null = null
              try {
                parsedInput = JSON.parse(pending.args) as Record<string, unknown>
              } catch {
                parsedInput = null
              }
              toolCalls.push({
                name: pending.name,
                input: parsedInput,
                output: null,
              })
              pendingToolCalls.delete(chunk.toolCallId)
            }
            break
          }
          case 'TOOL_RESULT': {
            // Match tool result to a tool call and check for shopping list generation
            const call = toolCalls.find(
              (tc) => tc.output === null && tc.name === (chunk as { toolName?: string }).toolName,
            )
            if (call) {
              call.output = chunk.result as Record<string, unknown>
            }

            // Check if this is a generate_shopping_list result
            const result = chunk.result as Record<string, unknown> | null
            if (result && result.accepted && Array.isArray(result.items)) {
              suggestion = {
                summary: (result.summary as string) ?? '',
                items: (result.items as AISuggestedItem[]) ?? [],
                totalEstimatedCost: (result.totalEstimatedCost as number) ?? 0,
              }
            }
            break
          }
        }
      }

      return {
        message: { role: 'assistant' as const, content: responseText },
        toolCalls,
        suggestion,
      }
    } catch (err) {
      const message = parseAIError(err)
      throw new Error(message)
    }
  })
