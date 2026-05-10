import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import {
  useProfile,
  useUpdateUserName,
  useUpdateProtectedProfile,
  useSendEmailVerificationCode,
} from '@/hooks/use-profile'
import { IdentitySection } from './identity-section'
import { ContactSection } from './contact-section'
import { PasswordDialog } from './password-dialog'
import { EmailOtpDialog } from './email-otp-dialog'
import type { UserRole } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type DialogState =
  | null
  | {
      step: 'password'
      pending: {
        avatar?: string
        username?: string
        newPassword?: string
        newEmail?: string
      }
    }
  | {
      step: 'email-otp'
      newEmail: string
      newEmailVerificationRecordId: string
      currentIdentityVerificationId: string
    }

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  chef: 'Chef',
  runner: 'Runner',
}

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  chef: 'bg-green-100 text-green-800 border-green-200',
  runner: 'bg-slate-100 text-slate-700 border-slate-200',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const auth = useAuth()

  const { data: logtoProfile, isLoading } = useProfile()

  // Form state
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarPreviewError, setAvatarPreviewError] = useState(false)

  // Dialog state machine
  const [dialog, setDialog] = useState<DialogState>(null)

  useEffect(() => {
    if (!logtoProfile) return
    setName(logtoProfile.name ?? '')
    setUsername(logtoProfile.username ?? '')
    setAvatar(logtoProfile.avatar ?? '')
    setEmail(logtoProfile.primaryEmail ?? '')
    setAvatarPreviewError(false)
  }, [logtoProfile])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateNameMutation = useUpdateUserName()
  const updateProtectedMutation = useUpdateProtectedProfile()
  const sendOtpMutation = useSendEmailVerificationCode()

  // ── Change detection ───────────────────────────────────────────────────────

  const nameChanged = name.trim() !== (logtoProfile?.name ?? '')
  const usernameChanged = username.trim() !== (logtoProfile?.username ?? '')
  const avatarChanged = avatar.trim() !== (logtoProfile?.avatar ?? '')
  const emailChanged = email.trim() !== (logtoProfile?.primaryEmail ?? '')
  const passwordChanged = newPassword.length > 0
  const passwordsMatch = newPassword === confirmPassword
  const protectedChanged = usernameChanged || avatarChanged || emailChanged || passwordChanged
  const isDirty = nameChanged || protectedChanged
  const hasError = passwordChanged && !passwordsMatch
  const isSaving =
    updateNameMutation.isPending ||
    updateProtectedMutation.isPending ||
    sendOtpMutation.isPending

  // ── Save flow ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (hasError) {
      toast.error('Passwords do not match.')
      return
    }

    if (nameChanged) {
      try {
        await updateNameMutation.mutateAsync(name.trim())
      } catch {
        return
      }
    }

    if (protectedChanged) {
      setDialog({
        step: 'password',
        pending: {
          ...(avatarChanged ? { avatar: avatar.trim() } : {}),
          ...(usernameChanged ? { username: username.trim() } : {}),
          ...(passwordChanged ? { newPassword } : {}),
          ...(emailChanged ? { newEmail: email.trim() } : {}),
        },
      })
    } else if (!nameChanged) {
      toast('Nothing changed.')
    } else {
      toast.success('Profile updated.')
    }
  }

  async function handlePasswordVerified(verificationRecordId: string) {
    if (dialog?.step !== 'password') return
    const { pending } = dialog
    setDialog(null)

    const hasProtectedFieldUpdate =
      pending.avatar !== undefined || pending.username !== undefined || pending.newPassword

    if (hasProtectedFieldUpdate) {
      try {
        await updateProtectedMutation.mutateAsync({
          ...(pending.avatar !== undefined ? { avatar: pending.avatar } : {}),
          ...(pending.username !== undefined ? { username: pending.username } : {}),
          ...(pending.newPassword ? { newPassword: pending.newPassword } : {}),
          verificationRecordId,
        })
        setNewPassword('')
        setConfirmPassword('')
      } catch {
        return
      }
    }

    if (pending.newEmail) {
      try {
        const { verificationRecordId: newEmailVerificationRecordId } =
          await sendOtpMutation.mutateAsync(pending.newEmail)
        setDialog({
          step: 'email-otp',
          newEmail: pending.newEmail,
          newEmailVerificationRecordId,
          currentIdentityVerificationId: verificationRecordId,
        })
      } catch {
        return
      }
    } else {
      toast.success('Profile updated.')
    }
  }

  function handleEmailOtpSuccess() {
    setDialog(null)
    toast.success('Profile updated.')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const displayName = name || auth?.userName || 'User'
  const avatarSrc = avatar && !avatarPreviewError ? avatar : undefined

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Profile" description="Manage your personal details." />

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <IdentitySection
              displayName={displayName}
              avatarSrc={avatarSrc}
              avatarPreviewError={avatarPreviewError}
              name={name}
              username={username}
              avatar={avatar}
              onNameChange={setName}
              onUsernameChange={setUsername}
              onAvatarChange={(v) => { setAvatar(v); setAvatarPreviewError(false) }}
              onAvatarPreviewError={() => setAvatarPreviewError(true)}
            />

            <ContactSection
              email={email}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              passwordChanged={passwordChanged}
              passwordsMatch={passwordsMatch}
              onEmailChange={setEmail}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
            />

            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Role</span>
                {auth?.userRole && (
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${ROLE_COLORS[auth.userRole]}`}
                  >
                    {ROLE_LABELS[auth.userRole]}
                  </Badge>
                )}
              </div>
              <Button onClick={handleSave} disabled={!isDirty || hasError || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </div>
        )}
      </div>

      <PasswordDialog
        open={dialog?.step === 'password'}
        onVerified={handlePasswordVerified}
        onCancel={() => setDialog(null)}
      />

      {dialog?.step === 'email-otp' && (
        <EmailOtpDialog
          open
          newEmail={dialog.newEmail}
          newEmailVerificationRecordId={dialog.newEmailVerificationRecordId}
          currentIdentityVerificationId={dialog.currentIdentityVerificationId}
          onSuccess={handleEmailOtpSuccess}
          onCancel={() => setDialog(null)}
        />
      )}
    </AppLayout>
  )
}
