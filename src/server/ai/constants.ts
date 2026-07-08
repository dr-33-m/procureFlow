import type { openRouterText } from '@tanstack/ai-openrouter'

export const DEFAULT_LOOKBACK = 90
export const HOTEL_DEFAULT_LEAD_TIME = 3
export const Z_95 = 1.65

export const MODEL = (process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b:free') as Parameters<
  typeof openRouterText
>[0]

// Vision-capable model for image extraction (menu reader). Prefer the explicit
// vision override, then the app-wide OpenRouter model. The default is a current
// Claude vision-capable model instead of a weaker free text model so a clear
// menu image does not get mislabeled as unreadable.
export const VISION_MODEL = (process.env.OPENROUTER_VISION_MODEL ??
  process.env.OPENROUTER_MODEL ??
  'anthropic/claude-sonnet-4.5') as Parameters<typeof openRouterText>[0]
