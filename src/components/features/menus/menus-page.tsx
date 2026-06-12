import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus, ChefHat, Coffee, UtensilsCrossed, Wine, Sparkles, EggFried } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { AddMenuWizard } from './add-menu-wizard'
import { useMenus } from '@/hooks/use-menus'
import { usePermissions } from '@/hooks/use-permissions'

const MEAL_TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType; order: number }
> = {
  breakfast: { label: 'Breakfast', icon: Coffee, order: 1 },
  lunch: { label: 'Lunch', icon: UtensilsCrossed, order: 2 },
  dinner: { label: 'Dinner', icon: ChefHat, order: 3 },
  drinks: { label: 'Drinks', icon: Wine, order: 4 },
  event: { label: 'Events', icon: Sparkles, order: 5 },
}

export function MenusPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [proclyOpen, setProclyOpen] = useState(false)
  const { data: menus = [], isLoading } = useMenus({ includeInactive: true })
  const { canManageMenus } = usePermissions()

  const grouped = menus.reduce<Record<string, typeof menus>>((acc, m) => {
    if (!acc[m.mealType]) acc[m.mealType] = []
    acc[m.mealType].push(m)
    return acc
  }, {})

  const groupOrder = Object.keys(grouped).sort(
    (a, b) => (MEAL_TYPE_META[a]?.order ?? 99) - (MEAL_TYPE_META[b]?.order ?? 99),
  )

  return (
    <>
      <>
        <PageHeader
          title="Menus"
          description="Recipes the AI uses as the starting point for issuance and demand forecasting."
          actions={
            canManageMenus ? (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Menu
                </Button>
                <Button className="gap-2" onClick={() => setProclyOpen(true)}>
                  <EggFried className="h-4 w-4" />
                  Add Menu with Procly
                </Button>
              </>
            ) : undefined
          }
        />

        {!isLoading && menus.length === 0 && (
          <EmptyState
            title="No menus yet"
            description={
              canManageMenus
                ? 'Create your first menu — add dishes with structured recipes so the AI can compute issuance from guests × days × meals.'
                : 'No menus have been set up yet. Ask a manager to create one.'
            }
            action={
              canManageMenus ? (
                <Button onClick={() => setAddOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create your first menu
                </Button>
              ) : undefined
            }
          />
        )}

        <div className="space-y-8">
          {groupOrder.map((mealType) => {
            const meta = MEAL_TYPE_META[mealType] ?? {
              label: mealType,
              icon: ChefHat,
              order: 99,
            }
            const Icon = meta.icon
            return (
              <section key={mealType}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[mealType].map((m) => (
                    <Link
                      key={m.id}
                      to="/menus/$menuId"
                      params={{ menuId: m.id }}
                      className="rounded-lg border bg-card p-4 transition hover:border-primary hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">{m.name}</h3>
                        {!m.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {m.eventTag && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {m.eventTag}
                        </Badge>
                      )}
                      {m.notes && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {m.notes}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <AddMenuWizard open={addOpen} startStep="edit" onClose={() => setAddOpen(false)} />

        <AddMenuWizard open={proclyOpen} startStep="upload" onClose={() => setProclyOpen(false)} />
      </>
    </>
  )
}
