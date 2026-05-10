import { Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getInitials } from '@/lib/utils'

type Props = {
  displayName: string
  avatarSrc?: string
  avatarPreviewError: boolean
  name: string
  username: string
  avatar: string
  onNameChange: (v: string) => void
  onUsernameChange: (v: string) => void
  onAvatarChange: (v: string) => void
  onAvatarPreviewError: () => void
}

export function IdentitySection({
  displayName,
  avatarSrc,
  name,
  username,
  avatar,
  onNameChange,
  onUsernameChange,
  onAvatarChange,
  onAvatarPreviewError,
}: Props) {
  return (
    <div className="p-6 flex items-start gap-5 border-b">
      <Avatar className="h-20 w-20 shrink-0">
        {avatarSrc && (
          <AvatarImage
            src={avatarSrc}
            alt={displayName}
            onError={onAvatarPreviewError}
          />
        )}
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
          <Input
            id="username"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="your_username"
          />
          <p className="text-xs text-muted-foreground">Letters, numbers, underscores.</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="avatar-url">Avatar URL</Label>
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
          <Input
            id="avatar-url"
            value={avatar}
            onChange={(e) => {
              onAvatarChange(e.target.value)
            }}
            placeholder="https://example.com/photo.png"
          />
        </div>
      </div>
    </div>
  )
}
