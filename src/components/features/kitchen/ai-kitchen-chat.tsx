import { useState, useRef, useEffect } from 'react'
import type { UIMessage } from '@tanstack/ai-react'
import {
  EggFried,
  Send,
  Loader2,
  Package,
  Search,
  ClipboardCheck,
  Square,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { ReconciliationConfirmCard } from './reconciliation-confirm-card'

const TOOL_DISPLAY: Record<string, { label: string; icon: typeof Package }> = {
  get_kitchen_stock: { label: 'Loaded kitchen stock', icon: Package },
  match_product: { label: 'Matched product', icon: Search },
  draft_reconciliation: { label: 'Drafted reconciliation', icon: ClipboardCheck },
}

const QUICK_PROMPTS = [
  {
    label: 'Quick reconcile',
    prompt:
      'Dinner tonight was 40 guests, ran as planned. Used everything that was issued.',
  },
  {
    label: 'Reorder report',
    prompt:
      "We had reorders tonight — 30 guests but I plated 42. Used most of the protein, a bit of waste, the rest is leftover for tomorrow.",
  },
]

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; content: string } => p.type === 'text')
    .map((p) => p.content)
    .join('')
}

function stripMarkdownTables(text: string): string {
  if (!text.includes('|')) return text
  const lines = text.split('\n')
  const drop: Set<number> = new Set()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? ''
    if (!line.startsWith('|') || !line.endsWith('|')) continue
    const next = lines[i + 1]?.trim() ?? ''
    if (/^\|[\s:]*-+[\s:]*\|/.test(next)) {
      drop.add(i)
      drop.add(i + 1)
      let j = i + 2
      while (j < lines.length && lines[j]?.trim().startsWith('|')) {
        drop.add(j)
        j++
      }
      i = j - 1
    }
  }
  return lines
    .filter((_, idx) => !drop.has(idx))
    .join('\n')
    .trim()
}

type ToolCallPart = {
  type: 'tool-call'
  name: string
  id: string
  state: string
  arguments: string
  result?: unknown
  output?: unknown
}

function getToolCalls(message: UIMessage): ToolCallPart[] {
  return message.parts.filter((p) => p.type === 'tool-call') as ToolCallPart[]
}

function readToolResult(c: ToolCallPart): Record<string, unknown> | null {
  const raw = (c.result ?? c.output) as Record<string, unknown> | undefined
  return raw && typeof raw === 'object' ? raw : null
}

function findDraft(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    const calls = getToolCalls(m)
    for (let j = calls.length - 1; j >= 0; j--) {
      const c = calls[j]
      if (c.name !== 'draft_reconciliation') continue
      const result = readToolResult(c)
      if (result && result.accepted) return result
    }
  }
  return null
}

interface AIKitchenChatProps {
  messages: UIMessage[]
  isLoading: boolean
  onSendMessage: (text: string) => void
  onStopGenerating: () => void
  onClearChat: () => void
}

export function AIKitchenChat({
  messages,
  isLoading,
  onSendMessage,
  onStopGenerating,
  onClearChat,
}: AIKitchenChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    onSendMessage(text)
    setInput('')
  }

  const draft = findDraft(messages)

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex flex-col items-center text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                <EggFried className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Procly · Kitchen</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tell me about the service — how many guests, how many servings, what got
                used, wasted, or left over. I'll draft the reconciliation; you confirm.
              </p>
            </div>
            <div className="space-y-1.5 pt-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick prompts
              </p>
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => onSendMessage(qp.prompt)}
                  className="block w-full rounded-md border bg-card px-3 py-2 text-left text-xs hover:border-primary hover:bg-accent transition-colors"
                >
                  <p className="font-medium">{qp.label}</p>
                  <p className="mt-0.5 text-muted-foreground line-clamp-2">{qp.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = stripMarkdownTables(getTextContent(m))
          const toolCalls = getToolCalls(m)

          if (m.role === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
                  {text}
                </div>
              </div>
            )
          }

          return (
            <div key={m.id} className="space-y-2">
              {toolCalls
                .filter((tc) => tc.name !== 'draft_reconciliation')
                .map((tc) => {
                  const display = TOOL_DISPLAY[tc.name] ?? {
                    label: tc.name.replace(/_/g, ' '),
                    icon: EggFried,
                  }
                  const Icon = display.icon
                  const isDone =
                    tc.state === 'input-complete' || tc.result !== undefined
                  return (
                    <div
                      key={tc.id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span>{display.label}</span>
                      {isDone ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      )}
                    </div>
                  )
                })}
              {text && (
                <div className="max-w-[92%] rounded-lg bg-muted px-3 py-2 text-sm">
                  <MarkdownContent content={text} />
                </div>
              )}
            </div>
          )
        })}

        {isLoading && messages.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Thinking…</span>
          </div>
        )}

        {draft && !isLoading && (
          <ReconciliationConfirmCard draft={draft as never} />
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t p-3 space-y-2">
        <div className="flex gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="What happened in service tonight?"
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <div className="flex flex-col gap-1.5">
            {isLoading ? (
              <Button type="button" variant="outline" size="icon" onClick={onStopGenerating}>
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClearChat}
                title="Clear conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
