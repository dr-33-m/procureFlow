import { useCallback, useRef } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { toast } from 'sonner'
import { useBranchContext } from '@/stores/branch-context'

export type IssuancePlanningContext = {
  expectedGuestCount?: number
  days?: number
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'event'
  menuHint?: string
  eventTag?: string
}

export function useAIIssuance(planningContext?: IssuancePlanningContext) {
  const branchId = useBranchContext((s) => s.activeBranchId)

  const branchIdRef = useRef(branchId)
  branchIdRef.current = branchId
  const contextRef = useRef(planningContext)
  contextRef.current = planningContext

  const connectionRef = useRef(
    fetchServerSentEvents('/api/ai-issuance', () => ({
      body: {
        branchId: branchIdRef.current,
        context: contextRef.current,
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
      toast.error(err instanceof Error ? err.message : 'Procly error')
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
