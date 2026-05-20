import { Sparkles } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AIIssuanceChat } from './ai-issuance-chat'
import { useAIIssuance, type IssuancePlanningContext } from '@/hooks/use-ai-issuance'

interface AIIssuanceDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planningContext?: IssuancePlanningContext
}

export function AIIssuanceDrawer({
  open,
  onOpenChange,
  planningContext,
}: AIIssuanceDrawerProps) {
  const { messages, sendMessage, clearChat, stopGenerating, isLoading } =
    useAIIssuance(planningContext)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
        showCloseButton
      >
        <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-sm">Issuance Assistant</SheetTitle>
              <SheetDescription className="text-xs">
                Menu-driven, context-aware proposals
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <AIIssuanceChat
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            onStopGenerating={stopGenerating}
            onClearChat={clearChat}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
