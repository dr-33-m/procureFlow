// Turn an OpenRouter/SDK error into a human-readable message for the UI.
// Shared by every AI server function (shopping, pantry-gen, menu-extract, …).
//
// Handles three shapes:
//   1. SDK Error instances — `statusCode` + JSON `body` (rich provider text in
//      error.metadata.raw).
//   2. RUN_ERROR stream chunks — provider errors that arrive as a stream event
//      rather than a throw: `{ message, code }` (+ deprecated nested `error`).
//   3. Plain Error — fall back to `.message`.
export function parseAIError(err: unknown): string {
  const e = err as {
    statusCode?: number
    body?: string
    message?: string
    code?: string | number
    error?: { message?: string; code?: string | number }
  } | null

  if (e && typeof e === 'object') {
    // Richest source first: the SDK error body carries the provider's raw text.
    if (typeof e.body === 'string') {
      try {
        const parsed = JSON.parse(e.body) as {
          error?: { message?: string; metadata?: { raw?: string } }
        }
        const raw = parsed.error?.metadata?.raw
        if (raw) return raw
        if (parsed.error?.message) return parsed.error.message
      } catch {
        // body wasn't JSON, fall through
      }
    }

    const code = e.statusCode ?? toNum(e.code) ?? toNum(e.error?.code)
    if (code === 429) return 'AI model is rate-limited. Please wait a moment and try again.'
    if (code === 401) return 'AI API key is invalid or missing.'
    if (code === 402) return 'AI API quota exceeded. Check your OpenRouter billing.'
    if (code === 503) return 'AI model is temporarily unavailable. Try again shortly.'

    const message = e.message ?? e.error?.message
    if (code && message) return `AI provider error (${code}): ${message}`
    if (message) return message
  }

  return 'An unexpected error occurred with the AI assistant'
}

function toNum(v: string | number | undefined): number | undefined {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}
