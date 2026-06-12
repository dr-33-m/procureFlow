import { useState } from 'react'
import { Link, useNavigate, getRouteApi } from '@tanstack/react-router'
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { MenuFormDialog } from './menu-form-dialog'
import { DishEditor } from './dish-editor'
import { DishReconciliationPanel } from './dish-reconciliation-panel'
import { useMenu, useCreateDish, useDeleteMenu } from '@/hooks/use-menus'
import { usePermissions } from '@/hooks/use-permissions'

const routeApi = getRouteApi('/_app/menus/$menuId')

export function MenuDetailPage() {
  const { menuId } = routeApi.useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useMenu(menuId)
  const { canManageMenus } = usePermissions()
  const [editMenuOpen, setEditMenuOpen] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const [showNewDishInput, setShowNewDishInput] = useState(false)

  const createDish = useCreateDish()
  const deleteMenu = useDeleteMenu()

  if (isLoading) {
    return (
      <>
        <p className="text-sm text-muted-foreground">Loading menu…</p>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <EmptyState
          title="Menu not found"
          description="It may have been deleted, or you don't have access."
          action={
            <Button asChild variant="outline">
              <Link to="/menus">Back to menus</Link>
            </Button>
          }
        />
      </>
    )
  }

  const { menu, dishes } = data

  const handleAddDish = async () => {
    const name = newDishName.trim()
    if (!name) return
    await createDish.mutateAsync({ menuId: menu.id, name })
    setNewDishName('')
    setShowNewDishInput(false)
  }

  const handleDeleteMenu = async () => {
    if (!confirm(`Delete menu "${menu.name}" and all its dishes?`)) return
    await deleteMenu.mutateAsync(menu.id)
    navigate({ to: '/menus' })
  }

  return (
    <>
      <>
        <div className="mb-4">
          <Link
            to="/menus"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            All menus
          </Link>
        </div>

        <PageHeader
          title={menu.name}
          description={
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {menu.mealType}
              </Badge>
              {menu.eventTag && <Badge variant="outline">{menu.eventTag}</Badge>}
              {!menu.isActive && <Badge variant="outline">Inactive</Badge>}
              {menu.notes && <span className="text-muted-foreground">— {menu.notes}</span>}
            </span>
          }
          actions={
            canManageMenus ? (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setEditMenuOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit menu
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={handleDeleteMenu}
                  disabled={deleteMenu.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : undefined
          }
        />

        <DishReconciliationPanel menuId={menu.id} />

        <div className="space-y-3">
          {dishes.length === 0 && !showNewDishInput && (
            <EmptyState
              title="No dishes yet"
              description="Add dishes with structured recipes so the AI can compute ingredient demand."
              action={
                canManageMenus ? (
                  <Button onClick={() => setShowNewDishInput(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add first dish
                  </Button>
                ) : undefined
              }
            />
          )}

          {dishes.map((dish) => (
            <DishEditor key={dish.id} dish={dish} />
          ))}

          {canManageMenus && (
            <div className="pt-2">
              {showNewDishInput ? (
                <div className="flex gap-2 items-center rounded-lg border bg-card p-3">
                  <input
                    autoFocus
                    type="text"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDish()
                      if (e.key === 'Escape') {
                        setShowNewDishInput(false)
                        setNewDishName('')
                      }
                    }}
                    placeholder="Dish name (e.g. Full English Breakfast)"
                    className="flex-1 rounded border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddDish}
                    disabled={!newDishName.trim() || createDish.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNewDishInput(false)
                      setNewDishName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : dishes.length > 0 ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowNewDishInput(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add another dish
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <MenuFormDialog
          open={editMenuOpen}
          onClose={() => setEditMenuOpen(false)}
          menu={menu}
        />
      </>
    </>
  )
}
