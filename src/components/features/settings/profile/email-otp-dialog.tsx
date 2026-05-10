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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { useVerifyEmailCode, useUpdatePrimaryEmail } from '@/hooks/use-profile'

type Props = {
  open: boolean
  newEmail: string
  newEmailVerificationRecordId: string
  currentIdentityVerificationId: string
  onSuccess: () => void
  onCancel: () => void
}

export function EmailOtpDialog({
  open,
  newEmail,
  newEmailVerificationRecordId,
  currentIdentityVerificationId,
  onSuccess,
  onCancel,
}: Props) {
  const [code, setCode] = useState('')

  const verifyMutation = useVerifyEmailCode()
  const updateMutation = useUpdatePrimaryEmail()

  const isPending = verifyMutation.isPending || updateMutation.isPending

  const handleVerify = () => {
    verifyMutation.mutate(
      { email: newEmail, code, verificationRecordId: newEmailVerificationRecordId },
      {
        onSuccess: () => {
          updateMutation.mutate(
            {
              newEmail,
              newEmailVerificationRecordId,
              currentIdentityVerificationId,
            },
            {
              onSuccess: () => {
                setCode('')
                onSuccess()
              },
            },
          )
        },
      },
    )
  }

  const handleClose = () => {
    setCode('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify new email</DialogTitle>
          <DialogDescription>
            We sent a 6-digit code to <strong>{newEmail}</strong>. Enter it below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={() => code.length === 6 && handleVerify()}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              disabled={code.length < 6 || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
