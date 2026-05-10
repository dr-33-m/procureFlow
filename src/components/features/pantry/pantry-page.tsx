import { useState } from 'react'
import { Download, Plus, Upload } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { EditItemDialog } from './edit-item-dialog'
import { AddItemDialog } from './add-item-dialog'
import { ImportInventoryDialog } from './import-inventory-dialog'
import { InventoryFilters } from './inventory-filters'
import { InventoryTable } from './inventory-table'
import { usePantryStats } from '@/hooks/use-pantry'
import { usePermissions } from '@/hooks/use-permissions'
import { formatCurrency } from '@/lib/format'
import type { InventoryWithProduct } from '@/types'

type PantryItem = InventoryWithProduct & { parPerGuest: string | null }

export function PantryPage() {
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const { data: stats } = usePantryStats()
  const { canEditInventory } = usePermissions()

  return (
    <AppLayout>
      <>
        <PageHeader
          title="Pantry Inventory"
          description="Current stock levels for essential supplies and raw materials."
          actions={
            canEditInventory ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="outline"
                        className="gap-2 cursor-not-allowed opacity-60"
                        disabled
                        tabIndex={-1}
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                        <Badge variant="secondary" className="ml-0.5 text-xs">
                          Soon
                        </Badge>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Coming Soon</TooltipContent>
                </Tooltip>

                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>

                <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </>
            ) : undefined
          }
        />

        {/* Stat Cards */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total SKUs"
            value={(stats?.totalSkus ?? 0).toLocaleString()}
            subValue="+12 from last month"
            subValueVariant="positive"
            accentBorder
            variant="default"
          />
          <StatCard
            label="Low Stock Items"
            value={stats?.lowStockCount ?? 0}
            subValue="Requires immediate attention"
            subValueVariant="warning"
            accentBorder
            variant="warning"
          />
          <StatCard
            label="Out of Stock"
            value={stats?.outOfStockCount ?? 0}
            subValue="Critical Impact"
            subValueVariant="danger"
            accentBorder
            variant="danger"
          />
          <StatCard
            label="Inventory Value"
            value={formatCurrency(stats?.inventoryValue ?? 0)}
            subValue="Adjusted for FIFO"
            accentBorder
            variant="default"
            className="border-l-indigo-400"
          />
        </div>

        {/* Filters */}
        <InventoryFilters />

        {/* Table + Pagination */}
        <InventoryTable onEdit={canEditInventory ? setEditingItem : undefined} />

        {/* Dialogs */}
        <EditItemDialog
          key={editingItem?.id ?? 'closed'}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />

        <AddItemDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
        />

        <ImportInventoryDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
        />
      </>
    </AppLayout>
  )
}
