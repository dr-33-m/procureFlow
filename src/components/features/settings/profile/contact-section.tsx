import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  email: string
  newPassword: string
  confirmPassword: string
  passwordChanged: boolean
  passwordsMatch: boolean
  onEmailChange: (v: string) => void
  onNewPasswordChange: (v: string) => void
  onConfirmPasswordChange: (v: string) => void
}

export function ContactSection({
  email,
  newPassword,
  confirmPassword,
  passwordChanged,
  passwordsMatch,
  onEmailChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
}: Props) {
  return (
    <div className="p-6 grid grid-cols-1 gap-x-8 gap-y-5 border-b sm:grid-cols-2">
      {/* Email */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="email">Email address</Label>
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
        />
        <p className="text-xs text-muted-foreground">
          Changing email sends a verification code to the new address.
        </p>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label>Password</Label>
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            placeholder="New password"
          />
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Confirm password"
          />
        </div>
        {passwordChanged && !passwordsMatch && (
          <p className="text-xs text-destructive">Passwords do not match.</p>
        )}
      </div>
    </div>
  )
}
