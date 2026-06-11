import { proposeMenuDraftDef } from './tool-definitions'

// Passthrough action tool: its result is collected by the extract server
// function (no DB writes — the user reviews/edits the draft, then the existing
// generate + commit pipeline persists).
export function createMenuExtractTools() {
  const proposeMenuDraft = proposeMenuDraftDef.server(async (args: unknown) => {
    const data = args as Record<string, unknown>
    return { ...data, accepted: true }
  })

  return [proposeMenuDraft]
}
