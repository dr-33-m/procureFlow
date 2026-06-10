// Turn an OpenRouter/SDK error into a human-readable message for the UI.
// Shared by every AI server function (shopping, pantry-gen, …).
export function parseAIError(err: unknown): string {
  if (err instanceof Error) {
    // OpenRouter SDK errors carry statusCode + body with nested error.message
    const statusCode = (err as { statusCode?: number }).statusCode
    const body = (err as { body?: string }).body

    if (body) {
      try {
        const parsed = JSON.parse(body) as {
          error?: { message?: string; metadata?: { raw?: string } }
        }
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
