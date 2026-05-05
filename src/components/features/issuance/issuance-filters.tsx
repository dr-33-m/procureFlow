import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const routeApi = getRouteApi('/issuance/')

interface IssuanceFiltersProps {
  categories: string[]
  filteredCount: number
  totalCount: number
}

export function IssuanceFilters({ categories, filteredCount, totalCount }: IssuanceFiltersProps) {
  const { q, category } = routeApi.useSearch()
  const navigate = useNavigate({ from: '/issuance/' })

  const setQ = (val: string) =>
    navigate({ search: (prev) => ({ ...prev, q: val || undefined }) })

  const setCategory = (val: string) =>
    navigate({ search: (prev) => ({ ...prev, category: val === 'all' ? undefined : val }) })

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search items or SKU..."
          value={q ?? ''}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category ?? 'all'} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        {filteredCount} of {totalCount} items
      </p>
    </div>
  )
}
