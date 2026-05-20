import { useCallback, useRef } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { toast } from 'sonner'
import { useBranchContext } from '@/stores/branch-context'

export function useAIKitchen() {
  const branchId = useBranchContext((s) => s.activeBranchId)

  const branchIdRef = useRef(branchId)
  branchIdRef.current = branchId

  const connectionRef = useRef(
    fetchServerSentEvents('/api/ai-kitchen', () => ({
      body: { branchId: branchIdRef.current },
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
      toast.error(err instanceof Error ? err.message : 'Kitchen assistant error')
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
