import { proposeStructuredPantryDef } from './tool-definitions'
import type { StructuredPantry } from '@/lib/pantry-gen'

// Passthrough action tool: its result is collected by the generate server
// function (no DB writes here — the user reviews and confirms first, then
// commitGeneratedPantry persists).
export function createPantryGenTools() {
  const proposeStructuredPantry = proposeStructuredPantryDef.server(async (args: unknown) => {
    const data = args as StructuredPantry
    return { ...data, accepted: true }
  })

  return [proposeStructuredPantry]
}
