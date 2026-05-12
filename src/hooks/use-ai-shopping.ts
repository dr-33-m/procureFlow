import { useCallback, useRef } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { toast } from 'sonner'
import { useBranchContext } from '@/stores/branch-context'

type EditorContext = {
  existingItems?: Array<{ productId: string; productName: string; quantity: number }>
  periodType?: string
  periodDays?: number
  expectedGuestCount?: number
  mealsPerDay?: number
  avgDailyGuests?: number
}

export function useAIShopping(editorContext?: EditorContext) {
  const branchId = useBranchContext((s) => s.activeBranchId)

  // Keep refs so the connection callback always reads current values
  // without recreating the connection (which resets chat history)
  const branchIdRef = useRef(branchId)
  branchIdRef.current = branchId
  const editorContextRef = useRef(editorContext)
  editorContextRef.current = editorContext

  // Stable connection — options resolved at request time via callback
  const connectionRef = useRef(
    fetchServerSentEvents('/api/ai-chat', () => ({
      body: {
        branchId: branchIdRef.current,
        context: editorContextRef.current,
      },
    })),
  )

  const {
    messages,
    sendMessage: rawSendMessage,
    isLoading,
    error,
    clear,
    stop,
  } = useChat({
    connection: connectionRef.current,
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'AI assistant encountered an error')
    },
  })

  const sendMessage = useCallback(
    (text: string) => {
      rawSendMessage(text)
    },
    [rawSendMessage],
  )

  return {
    messages,
    sendMessage,
    clearChat: clear,
    stopGenerating: stop,
    isLoading,
    error,
  }
}
