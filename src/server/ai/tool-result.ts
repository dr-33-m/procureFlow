function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMaybeJson(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value

  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function extractToolResultObject(chunk: unknown): Record<string, unknown> | null {
  const c = chunk as {
    result?: unknown
    output?: unknown
    content?: unknown
  }

  if ('result' in c) return parseMaybeJson(c.result)
  if ('output' in c) return parseMaybeJson(c.output)
  if ('content' in c) return parseMaybeJson(c.content)

  return null
}
