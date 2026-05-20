import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateMenu, useUpdateMenu } from '@/hooks/use-menus'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'event'

type ExistingMenu = {
  id: string
  name: string
  mealType: string
  eventTag: string | null
  notes: string | null
  isActive: boolean
}

interface MenuFormDialogProps {
  open: boolean
  onClose: () => void
  menu?: ExistingMenu | null
}

export function MenuFormDialog({ open, onClose, menu }: MenuFormDialogProps) {
  const isEdit = !!menu
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [eventTag, setEventTag] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setName(menu?.name ?? '')
      setMealType((menu?.mealType as MealType) ?? 'breakfast')
      setEventTag(menu?.eventTag ?? '')
      setNotes(menu?.notes ?? '')
    }
  }, [open, menu])

  const createMutation = useCreateMenu()
  const updateMutation = useUpdateMenu()
  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSave = async () => {
    if (!name.trim()) return

    if (isEdit && menu) {
      await updateMutation.mutateAsync({
        menuId: menu.id,
        name: name.trim(),
        mealType,
        eventTag: eventTag.trim() || null,
        notes: notes.trim() || null,
      })
    } else {
      await createMutation.mutateAsync({
        name: name.trim(),
        mealType,
        eventTag: eventTag.trim() || null,
        notes: notes.trim() || null,
      })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Menu' : 'New Menu'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="menu-name">Name</Label>
            <Input
              id="menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Breakfast"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="menu-meal-type">Meal type</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
              <SelectTrigger id="menu-meal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="drinks">Drinks</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="menu-event-tag">
              Event tag <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="menu-event-tag"
              value={eventTag}
              onChange={(e) => setEventTag(e.target.value)}
              placeholder="e.g. wedding, conference"
            />
            <p className="text-xs text-muted-foreground">
              Segments learned per-guest rates so events don't pollute weekday averages.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="menu-notes">
              Notes <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="menu-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any context the AI should know about this menu."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save' : 'Create Menu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
