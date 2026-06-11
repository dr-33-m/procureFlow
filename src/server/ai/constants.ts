import { openRouterText } from '@tanstack/ai-openrouter'

export const DEFAULT_LOOKBACK = 90
export const HOTEL_DEFAULT_LEAD_TIME = 3
export const Z_95 = 1.65

export const MODEL = (process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b:free') as Parameters<
  typeof openRouterText
>[0]

// Vision-capable model for image extraction (menu reader). The text MODEL above
// is not multimodal, so the vision path needs its own override. Default is a
// free vision model for local smoke tests; production points this at a capable
// Claude vision model via env (e.g. anthropic/claude-sonnet-4) — no code change.
export const VISION_MODEL = (process.env.OPENROUTER_VISION_MODEL ??
  'nex-agi/nex-n2-pro:free') as Parameters<typeof openRouterText>[0]
