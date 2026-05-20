import { Sparkles } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AIKitchenChat } from './ai-kitchen-chat'
import { useAIKitchen } from '@/hooks/use-ai-kitchen'

interface AIKitchenDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIKitchenDrawer({ open, onOpenChange }: AIKitchenDrawerProps) {
  const { messages, sendMessage, clearChat, stopGenerating, isLoading } = useAIKitchen()

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
              <SheetTitle className="text-sm">Kitchen Reconciliation</SheetTitle>
              <SheetDescription className="text-xs">
                Tell me what happened. I'll draft the close-out.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <AIKitchenChat
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
