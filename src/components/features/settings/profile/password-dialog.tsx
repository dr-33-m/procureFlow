import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useVerifyPassword } from '@/hooks/use-profile'

type Props = {
  open: boolean
  onVerified: (verificationRecordId: string) => void
  onCancel: () => void
}

export function PasswordDialog({ open, onVerified, onCancel }: Props) {
  const [password, setPassword] = useState('')

  const mutation = useVerifyPassword()

  const handleSubmit = () => {
    mutation.mutate(password, {
      onSuccess: ({ verificationRecordId }) => {
        setPassword('')
        onVerified(verificationRecordId)
      },
    })
  }

  const handleClose = () => {
    setPassword('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify your identity</DialogTitle>
          <DialogDescription>
            Enter your current password to confirm these changes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="verify-current-password">Current password</Label>
            <Input
              id="verify-current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password && handleSubmit()}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!password || mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
