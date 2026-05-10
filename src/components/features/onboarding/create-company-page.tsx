import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createCompany } from '@/server/company'
import logoSvg from '@/assets/procureFlow.svg'

export function CreateCompanyPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    bio: '',
    branchName: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setLoading(true)
    try {
      await createCompany({
        data: {
          name: form.name.trim(),
          bio: form.bio.trim() || undefined,
          branchName: form.branchName.trim() || undefined,
        },
      })
      navigate({ to: '/' })
      toast.success('Company created! Welcome to ProcureFlow.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create company'
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
            <h1 className="text-2xl font-bold">Set up your company</h1>
            <p className="text-muted-foreground text-sm mt-1">
              You'll be the owner with full access to all branches.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Company details</CardTitle>
            </div>
            <CardDescription>This is how your company will appear in ProcureFlow.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Company name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. The Grand Hotel"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Description (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="A short description of your company..."
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branchName">First branch name</Label>
                <Input
                  id="branchName"
                  placeholder="Main Branch"
                  value={form.branchName}
                  onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Defaults to "Main Branch" — you can add more branches later.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !form.name.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create company & continue'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
