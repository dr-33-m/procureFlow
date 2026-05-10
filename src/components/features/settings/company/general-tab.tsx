import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useCompany, useUpdateCompany } from '@/hooks/use-company'

export function GeneralTab() {
  const auth = useAuth()
  const isOwner = auth?.userRole === 'owner'

  const { data: company, isLoading } = useCompany()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [initialized, setInitialized] = useState(false)

  if (company && !initialized) {
    setName(company.name)
    setBio(company.bio ?? '')
    setInitialized(true)
  }

  const mutation = useUpdateCompany()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isDirty =
    name.trim() !== (company?.name ?? '') || bio.trim() !== (company?.bio ?? '')

  return (
    <div className="rounded-lg border bg-card p-6 space-y-5 max-w-xl">
      <div className="space-y-1.5">
        <Label htmlFor="company-name">Company name</Label>
        {isOwner ? (
          <Input
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your company name"
          />
        ) : (
          <p className="text-sm py-2">{company?.name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company-bio">Description</Label>
        {isOwner ? (
          <Input
            id="company-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short description of your company"
          />
        ) : (
          <p className="text-sm py-2 text-muted-foreground">
            {company?.bio || 'No description set.'}
          </p>
        )}
      </div>

      {isOwner && (
        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => mutation.mutate({ name, bio })}
            disabled={!isDirty || !name.trim() || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      )}
    </div>
  )
}
