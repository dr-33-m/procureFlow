import { useState } from 'react'
import { Loader2, Pencil, Check, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCompanyBranches, useUpdateBranch, useCreateBranch } from '@/hooks/use-company'
import type { Branch } from '@/types'

function BranchRow({
  branch,
  onRename,
}: {
  branch: Branch
  onRename: (id: string, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(branch.name)

  const handleSave = () => {
    if (value.trim() && value.trim() !== branch.name) {
      onRename(branch.id, value.trim())
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setValue(branch.name)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3 py-3">
      {editing ? (
        <>
          <Input
            className="h-8 flex-1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
            <Check className="h-3.5 w-3.5 text-primary" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm">{branch.name}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}

export function BranchesTab() {
  const [newBranchName, setNewBranchName] = useState('')
  const [showInput, setShowInput] = useState(false)

  const { data: branches = [], isLoading } = useCompanyBranches()
  const renameMutation = useUpdateBranch()
  const createMutation = useCreateBranch()

  const handleCreate = () => {
    if (!newBranchName.trim()) return
    createMutation.mutate(
      { name: newBranchName.trim() },
      {
        onSuccess: () => {
          setNewBranchName('')
          setShowInput(false)
        },
      },
    )
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Branches</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your company's locations.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowInput(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New branch
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-4 divide-y">
            {branches.map((branch) => (
              <BranchRow
                key={branch.id}
                branch={branch}
                onRename={(id, name) => renameMutation.mutate({ id, name })}
              />
            ))}

            {showInput && (
              <div className="flex items-center gap-2 py-3">
                <Input
                  className="h-8 flex-1"
                  placeholder="Branch name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') {
                      setNewBranchName('')
                      setShowInput(false)
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newBranchName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewBranchName('')
                    setShowInput(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {branches.length === 0 && !showInput && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No branches yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
