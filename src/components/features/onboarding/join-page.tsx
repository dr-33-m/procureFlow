import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Ticket, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { redeemInvite } from '@/server/members'
import logoSvg from '@/assets/procureFlow.svg'

export function JoinPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return

    setLoading(true)
    try {
      const result = await redeemInvite({ data: { token: token.trim() } })
      navigate({ to: '/' })
      toast.success(`Joined ${result.companyName}! Welcome.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired token'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary p-2.5">
            <img src={logoSvg} alt="ProcureFlow" className="h-full w-full invert" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Join a company</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Paste the invite token you received from your company owner or admin.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Redeem invite token</CardTitle>
            </div>
            <CardDescription>Tokens expire after 7 days. Contact your manager if yours has expired.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="token">Invite token</Label>
                <Input
                  id="token"
                  placeholder="Paste your token here…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !token.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining…
                  </>
                ) : (
                  'Join company'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
