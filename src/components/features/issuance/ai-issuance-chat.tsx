import { useState, useRef, useEffect } from 'react'
import type { UIMessage } from '@tanstack/ai-react'
import {
  Sparkles,
  Send,
  Loader2,
  ChefHat,
  ClipboardList,
  Package,
  Clock,
  TrendingUp,
  Calculator,
  Square,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/ui/markdown-content'
import { AIProposalCard } from './ai-proposal-card'

const TOOL_DISPLAY: Record<string, { label: string; icon: typeof Package }> = {
  list_menus: { label: 'Listed available menus', icon: ChefHat },
  get_menu_recipe: { label: 'Loaded menu recipe', icon: ClipboardList },
  get_pantry_stock: { label: 'Checked pantry stock', icon: Package },
  get_expiring_inventory: { label: 'Checked expiring stock', icon: Clock },
  get_learned_per_guest: { label: 'Looked up learned per-guest rates', icon: TrendingUp },
  propose_issuance: { label: 'Built issuance proposal', icon: Calculator },
}

const QUICK_PROMPTS = [
  {
    label: 'Tonight\'s dinner',
    prompt: 'Help me issue stock for dinner tonight. I need to tell you the menu and guest count.',
  },
  {
    label: 'Weekly breakfast',
    prompt: 'I need a weekly issuance for breakfast — 40 guests per day, 7 days, standard menu.',
  },
  {
    label: 'Event prep',
    prompt: 'I have an event coming up. Help me work out what to issue.',
  },
]

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; content: string } => p.type === 'text')
    .map((p) => p.content)
    .join('')
}

// Strip markdown tables so we don't double-render when the agent emits both a
// table AND a propose_issuance call. Falls back to the original text when no
// table is found.
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
  // TanStack AI exposes the executed-tool result as `output` on the part.
  // Older code in this repo also reads `result`; accept either for safety.
  const raw = (c.result ?? c.output) as Record<string, unknown> | undefined
  return raw && typeof raw === 'object' ? raw : null
}

function findProposal(messages: UIMessage[]) {
  // Walk backwards — the most recent propose_issuance call wins. The agent
  // can revise during a session and we want to surface the latest version.
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    const calls = getToolCalls(m)
    for (let j = calls.length - 1; j >= 0; j--) {
      const c = calls[j]
      if (c.name !== 'propose_issuance') continue
      const result = readToolResult(c)
      if (result && result.accepted) return { proposal: result, messageId: m.id }
    }
  }
  return null
}

interface AIIssuanceChatProps {
  messages: UIMessage[]
  isLoading: boolean
  onSendMessage: (text: string) => void
  onStopGenerating: () => void
  onClearChat: () => void
}

export function AIIssuanceChat({
  messages,
  isLoading,
  onSendMessage,
  onStopGenerating,
  onClearChat,
}: AIIssuanceChatProps) {
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

  const proposal = findProposal(messages)

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex flex-col items-center text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Issuance Assistant</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tell me what service you're planning. I'll pull the menu recipe, check
                learned per-guest rates and expiring stock, then propose quantities to
                issue.
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

          // assistant
          return (
            <div key={m.id} className="space-y-2">
              {toolCalls
                .filter((tc) => tc.name !== 'propose_issuance')
                .map((tc) => {
                  const display = TOOL_DISPLAY[tc.name] ?? {
                    label: tc.name.replace(/_/g, ' '),
                    icon: Sparkles,
                  }
                  const Icon = display.icon
                  // TanStack AI states: awaiting-input | input-streaming |
                  // input-complete | approval-*. Tool is done when args are
                  // complete OR the server has returned output.
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

        {/* Proposal card — sticky-feeling, appears after agent finishes */}
        {proposal && !isLoading && (
          <AIProposalCard proposal={proposal.proposal as never} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
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
            placeholder="Describe the service (guests, days, menu)…"
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
