import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createInvite } from '@/server/members'
import { companyKeys } from '@/lib/query-manager/company/keys'
import { useAuth } from '@/hooks/use-auth'
import { useBranchContext } from '@/stores/branch-context'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const queryClient = useQueryClient()
  const auth = useAuth()
  const branches = useBranchContext((s) => s.branches)

  const isOwner = auth?.userRole === 'owner'

  const [loading, setLoading] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    email: '',
    role: '',
    branchId: '',
  })

  const needsBranch = form.role === 'chef' || form.role === 'runner'
  const canSubmit = !!form.email && !!form.role && (!needsBranch || !!form.branchId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      const result = await createInvite({
        data: {
          email: form.email,
          role: form.role,
          branchId: needsBranch ? form.branchId : null,
        },
      })
      setGeneratedToken(result.token)
      queryClient.invalidateQueries({ queryKey: companyKeys.pendingInvites() })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create invite'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!generatedToken) return
    navigator.clipboard.writeText(generatedToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Token copied to clipboard')
  }

  const handleClose = () => {
    setGeneratedToken(null)
    setCopied(false)
    setForm({ email: '', role: '', branchId: '' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Generate an invite token. The invitee pastes it during sign-up.
          </DialogDescription>
        </DialogHeader>

        {generatedToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this token with <strong>{form.email}</strong>. It expires in 7 days.
            </p>
            <div className="flex gap-2">
              <Input
                value={generatedToken}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v, branchId: '' }))}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="runner">Runner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsBranch && (
              <div className="space-y-1.5">
                <Label htmlFor="branch">Assign to branch</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !canSubmit}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  'Generate token'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
