import { useState } from 'react'
import { UserPlus, Trash2, Loader2, Clock } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { InviteDialog } from './invite-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/hooks/use-auth'
import { useMembers, usePendingInvites, useRemoveMember } from '@/hooks/use-company'
import { TierUsageBar } from '@/components/ui/tier-usage-bar'
import { getInitials } from '@/lib/utils'
import type { MemberWithDetails, UserRole } from '@/types'

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  chef: 'bg-green-100 text-green-800 border-green-200',
  runner: 'bg-slate-100 text-slate-700 border-slate-200',
}

function MemberRow({
  member,
  canRemove,
  onRemove,
}: {
  member: MemberWithDetails
  canRemove: boolean
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="h-9 w-9 shrink-0">
        {member.userAvatar && (
          <AvatarImage src={member.userAvatar} alt={member.userName} />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
          {getInitials(member.userName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.userName}</p>
        <p className="text-xs text-muted-foreground truncate">{member.userEmail}</p>
        {member.branchName && (
          <p className="text-xs text-muted-foreground">{member.branchName}</p>
        )}
      </div>
      <Badge
        variant="outline"
        className={`text-xs capitalize shrink-0 ${ROLE_COLORS[member.role]}`}
      >
        {member.role}
      </Badge>
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

export function MembersPage() {
  const auth = useAuth()
  const { canManageMembers } = usePermissions()
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: members = [], isLoading } = useMembers()
  const { data: pendingInvites = [] } = usePendingInvites()
  const removeMutation = useRemoveMember()

  const canRemoveMember = (member: MemberWithDetails) => {
    if (!canManageMembers) return false
    if (member.userId === auth?.userId) return false
    if (auth?.userRole === 'admin' && member.role === 'owner') return false
    if (auth?.userRole === 'admin' && member.role === 'admin') return false
    return true
  }

  const companyMembers = members.filter((m) => m.level === 'company')
  const branchMembers = members.filter((m) => m.level === 'branch')

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="Team members"
          description="Manage who has access to your company and branches."
          actions={
            <Button onClick={() => setInviteOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite member
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4">
          <TierUsageBar resource="users" label="Team members" />
          <TierUsageBar resource="branches" label="Branches" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {companyMembers.length > 0 && (
              <div className="rounded-lg border bg-card">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Company members</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Owners and admins have access to all branches.
                  </p>
                </div>
                <div className="px-4 divide-y">
                  {companyMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      canRemove={canRemoveMember(member)}
                      onRemove={() =>
                        removeMutation.mutate({ memberId: member.id, level: 'company' })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {branchMembers.length > 0 && (
              <div className="rounded-lg border bg-card">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Branch members</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Chefs and runners are assigned to a specific branch.
                  </p>
                </div>
                <div className="px-4 divide-y">
                  {branchMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      canRemove={canRemoveMember(member)}
                      onRemove={() =>
                        removeMutation.mutate({ memberId: member.id, level: 'branch' })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 && (
              <div className="rounded-lg border border-dashed bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No team members yet. Invite your first member to get started.
                </p>
              </div>
            )}

            {pendingInvites.length > 0 && (
              <div className="rounded-lg border bg-card">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Pending invites</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These tokens haven't been redeemed yet.
                  </p>
                </div>
                <div className="px-4 divide-y">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {invite.branchName ? `${invite.branchName} · ` : ''}
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize shrink-0 ${ROLE_COLORS[invite.role as UserRole]}`}
                      >
                        {invite.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </AppLayout>
  )
}
