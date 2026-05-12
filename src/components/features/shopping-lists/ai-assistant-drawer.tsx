import { Sparkles } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { AIShoppingChat } from './ai-shopping-chat'
import { useAIShopping } from '@/hooks/use-ai-shopping'

// ─── Props ───────────────────────────────────────────────────────────────────

interface AIAssistantDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editorContext?: {
    existingItems?: Array<{ productId: string; productName: string; quantity: number }>
    periodType?: string
    periodDays?: number
    expectedGuestCount?: number
    mealsPerDay?: number
    avgDailyGuests?: number
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AIAssistantDrawer({
  open,
  onOpenChange,
  editorContext,
}: AIAssistantDrawerProps) {
  const { messages, sendMessage, clearChat, stopGenerating, isLoading } =
    useAIShopping(editorContext)

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
              <SheetTitle className="text-sm">AI Shopping Assistant</SheetTitle>
              <SheetDescription className="text-xs">
                Smart list generation
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <AIShoppingChat
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
