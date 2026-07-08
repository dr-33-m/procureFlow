import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { normalizePantryStockStatus } from '@/lib/query-manager/pantry/keys'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchInput } from '@/components/ui/search-input'
import { useCategories } from '@/hooks/use-pantry'

const routeApi = getRouteApi('/_app/pantry/')

export function InventoryFilters() {
  const { category, sortBy, stockStatus, q } = routeApi.useSearch()
  const navigate = useNavigate({ from: '/pantry/' })
  const { data: categories = [] } = useCategories()
  const selectedStockStatus = normalizePantryStockStatus(stockStatus)
  const hasFilters =
    !!q ||
    (category ?? 'all') !== 'all' ||
    (sortBy ?? 'name') !== 'name' ||
    selectedStockStatus !== 'all'

  const setCategory = (val: string) =>
    navigate({ search: (prev) => ({ ...prev, category: val, page: 1 }) })

  const setSortBy = (val: string) =>
    navigate({ search: (prev) => ({ ...prev, sortBy: val, page: 1 }) })

  const setStockStatus = (val: string) =>
    navigate({
      search: (prev) => ({
        ...prev,
        stockStatus: normalizePantryStockStatus(val),
        page: 1,
      }),
    })

  const setQ = (val: string) =>
    navigate({ search: (prev) => ({ ...prev, q: val || undefined, page: 1 }) })

  const resetFilters = () =>
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        category: undefined,
        sortBy: undefined,
        stockStatus: 'all',
        q: undefined,
      }),
    })

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SearchInput
        value={q ?? ''}
        onChange={setQ}
        placeholder="Search items..."
        className="w-56"
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

      <Select value={selectedStockStatus} onValueChange={setStockStatus}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Stock" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stock</SelectItem>
          <SelectItem value="attention">Needs Attention</SelectItem>
          <SelectItem value="low">Low Stock</SelectItem>
          <SelectItem value="out">Out of Stock</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy ?? 'name'} onValueChange={setSortBy}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Sort by Name" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Sort by Name</SelectItem>
          <SelectItem value="quantity">Sort by Quantity</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={resetFilters}>
          Reset filters
        </Button>
      )}
    </div>
  )
}
