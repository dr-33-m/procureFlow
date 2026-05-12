import { openRouterText } from '@tanstack/ai-openrouter'

export const DEFAULT_LOOKBACK = 90
export const HOTEL_DEFAULT_LEAD_TIME = 3
export const Z_95 = 1.65

export const MODEL = (process.env.OPENROUTER_MODEL ?? 'openai/gpt-oss-120b:free') as Parameters<
  typeof openRouterText
>[0]
