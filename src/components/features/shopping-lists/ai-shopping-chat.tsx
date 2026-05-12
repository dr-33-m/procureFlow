import { useState, useRef, useEffect, useMemo } from 'react'
import type { UIMessage } from '@tanstack/ai-react'
import {
  Sparkles,
  Send,
  Loader2,
  Package,
  BarChart3,
  Search,
  ShoppingCart,
  ClipboardList,
  Calculator,
  CheckCircle2,
  Square,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/ui/markdown-content'
import {
  extractMarkdownTables,
  AITablePreview,
} from '@/components/features/shopping-lists/ai-table-dialog'

// ─── Tool display config ─────────────────────────────────────────────────────

const TOOL_DISPLAY: Record<string, { label: string; icon: typeof Package }> = {
  get_pantry_stock: { label: 'Checked pantry stock', icon: Package },
  get_consumption_history: { label: 'Analyzed consumption history', icon: BarChart3 },
  get_product_catalog: { label: 'Searched product catalog', icon: Search },
  get_open_orders: { label: 'Checked open orders', icon: ShoppingCart },
  get_previous_lists: { label: 'Reviewed previous lists', icon: ClipboardList },
  compute_item_restock: { label: 'Computed restock suggestion', icon: Calculator },
  generate_shopping_list: { label: 'Generated shopping list', icon: Sparkles },
}

// ─── Quick Prompts ───────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: 'Generate weekly list', prompt: 'Help me generate a weekly shopping list' },
  { label: "What's running low?", prompt: "What items are currently low in stock or out of stock?" },
  {
    label: 'Full-board event',
    prompt: 'I need a shopping list for a full-board event. Let me give you the details.',
  },
  { label: 'Review & optimize', prompt: 'Review my current list items and suggest optimizations' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; content: string } => p.type === 'text')
    .map((p) => p.content)
    .join('')
}

function getToolCalls(message: UIMessage) {
  return message.parts
    .filter((p) => p.type === 'tool-call')
    .map((p) => {
      const tc = p as { type: 'tool-call'; name: string; id: string; state: string; arguments: string }
      return tc
    })
}

function splitContentAndTables(text: string) {
  const tables = extractMarkdownTables(text)
  if (tables.length === 0) return { textWithoutTables: text, tables: [] }

  const lines = text.split('\n')
  const tableLineRanges: Array<[number, number]> = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]?.trim()
    if (line?.startsWith('|') && line.endsWith('|')) {
      const nextLine = lines[i + 1]?.trim()
      if (nextLine && /^\|[\s:]*-+[\s:]*\|/.test(nextLine)) {
        const start = i
        i += 2
        while (i < lines.length && lines[i]?.trim().startsWith('|')) i++
        tableLineRanges.push([start, i - 1])
        continue
      }
    }
    i++
  }

  const keep = lines.filter((_, idx) => {
    return !tableLineRanges.some(([s, e]) => idx >= s && idx <= e)
  })
  const cleaned = keep.join('\n').trim()

  return { textWithoutTables: cleaned, tables }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AIShoppingChatProps {
  messages: UIMessage[]
  isLoading: boolean
  onSendMessage: (text: string) => void
  onStopGenerating?: () => void
  onClearChat?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AIShoppingChat({
  messages,
  isLoading,
  onSendMessage,
  onStopGenerating,
  onClearChat,
}: AIShoppingChatProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSendMessage(text)
  }

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return
    onSendMessage(prompt)
  }

  const visibleMessages = messages.filter((m) => m.role !== 'system')

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleMessages.length === 0 && !isLoading ? (
          <EmptyState onQuickPrompt={handleQuickPrompt} />
        ) : (
          <>
            {visibleMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isStreaming={isLoading} />
            ))}
            {isLoading && visibleMessages.at(-1)?.role !== 'assistant' && <ThinkingIndicator />}
          </>
        )}
      </div>

      <div className="border-t p-3 space-y-2">
        {visibleMessages.length > 0 && !isLoading && (
          <div className="flex justify-center">
            <button
              onClick={onClearChat}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              New conversation
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your shopping list..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          {isLoading ? (
            <Button type="button" size="icon" variant="outline" onClick={onStopGenerating}>
              <Square className="h-3 w-3" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onQuickPrompt }: { onQuickPrompt: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">AI Shopping Assistant</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          I can help you generate smart shopping lists based on your pantry levels, guest count,
          meal plans, and historical consumption.
        </p>
      </div>
      <div className="grid w-full gap-2">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            onClick={() => onQuickPrompt(qp.prompt)}
            className="rounded-lg border border-border bg-background p-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {qp.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: UIMessage
  isStreaming: boolean
}) {
  const isUser = message.role === 'user'
  const text = getTextContent(message)
  const toolCalls = getToolCalls(message)
  const isLastAssistant = !isUser && isStreaming

  const { textWithoutTables, tables } = useMemo(() => splitContentAndTables(text), [text])

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] space-y-2 ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground'
            : 'space-y-2'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <>
            {toolCalls.length > 0 && (
              <div className="space-y-1">
                {toolCalls
                  .filter((tc) => tc.name !== 'generate_shopping_list')
                  .map((tc) => {
                    const display = TOOL_DISPLAY[tc.name]
                    const Icon = display?.icon ?? Package
                    const isDone = tc.state === 'input-complete' || (tc as any).output !== undefined
                    return (
                      <div
                        key={tc.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <Icon className="h-3 w-3" />
                        <span>{display?.label ?? tc.name}</span>
                        {isDone ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                      </div>
                    )
                  })}
              </div>
            )}

            {textWithoutTables && (
              <div className="rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm">
                <MarkdownContent content={textWithoutTables} />
                {isLastAssistant && <StreamingCursor />}
              </div>
            )}

            {tables.map((table, i) => (
              <AITablePreview key={i} table={table} maxRows={5} />
            ))}

            {!text && isLastAssistant && <ThinkingIndicator toolCalls={toolCalls} />}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Streaming Cursor ────────────────────────────────────────────────────────

function StreamingCursor() {
  return <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground/60 ml-0.5" />
}

// ─── Thinking Indicator ──────────────────────────────────────────────────────

function ThinkingIndicator({ toolCalls }: { toolCalls?: Array<{ state: string }> }) {
  const allToolsDone = toolCalls && toolCalls.length > 0 && toolCalls.every(
    (tc) => tc.state === 'input-complete' || (tc as any).output !== undefined
  )
  const label = allToolsDone ? 'Preparing response...' : 'Thinking...'

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  )
}
