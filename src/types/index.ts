import type {
  hotels,
  users,
  products,
  productSuppliers,
  productPriceHistory,
  shoppingLists,
  shoppingListItems,
  inventory,
  inventoryTransactions,
} from '@/db/schema'

// ─── Base types from schema ──────────────────────────────────────────────────

export type Hotel = typeof hotels.$inferSelect
export type User = typeof users.$inferSelect
export type Product = typeof products.$inferSelect
export type ProductSupplier = typeof productSuppliers.$inferSelect
export type ProductPriceHistory = typeof productPriceHistory.$inferSelect
export type ShoppingList = typeof shoppingLists.$inferSelect
export type ShoppingListItem = typeof shoppingListItems.$inferSelect
export type Inventory = typeof inventory.$inferSelect
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect

// ─── Packaging fields (denormalized into compound types) ─────────────────────

export interface ProductPackagingFields {
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  purchasePrice: string | null
  baseUnit: string | null
  baseUnitsPerStock: string | null
}

// ─── Compound types ──────────────────────────────────────────────────────────

export type ShoppingListWithDetails = ShoppingList & {
  creatorName: string | null
  runnerName: string | null
  itemCount: number
}

type ShoppingListItemWithProductBase = ShoppingListItem & {
  productName: string
  productCategory: string
  productBarcode: string | null
} & ProductPackagingFields

export type ShoppingListDetail = ShoppingList & {
  creatorName: string | null
  runnerName: string | null
  items: (ShoppingListItemWithProductBase & {
    suppliers: ProductSupplier[]
  })[]
}

export type ShoppingListDetailItem = ShoppingListDetail['items'][number]

export type ShoppingListItemWithProduct = ShoppingListItem & {
  productName: string
} & ProductPackagingFields

export type ProductWithStock = ProductPackagingFields & {
  id: string
  name: string
  category: string
  parPerGuest: string | null
  currentStock: number
}

export type ReceivingListSummary = ShoppingList & {
  creatorName: string | null
  runnerName: string | null
  itemCount: number
  verifiedItems: number
}

export type ReceivingListDetail = ShoppingList & {
  creatorName: string | null
  runnerName: string | null
  items: (ShoppingListItemWithProductBase & {
    suppliers: ProductSupplier[]
  })[]
  totalItems: number
  verifiedItems: number
}

export type InventoryWithProduct = Inventory & {
  productName: string
  productCategory: string
  productSku: string | null
  parPerGuest: string | null
  suppliers: ProductSupplier[]
} & ProductPackagingFields

export type DashboardStats = {
  totalItems: number
  totalCategories: number
  totalValuation: number
  inStockPct: number
  lowStockPct: number
  outOfStockPct: number
  criticalWarnings: number
  activeShoppingLists: number
  activeListsValue: number
}

export type RecentListActivity = {
  id: string
  name: string
  modifiedBy: string
  modifiedAt: Date
  value: string
  status: string
  priority: string
}

export type IssuanceItem = {
  productId: string
  productName: string
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  currentQty: number
  deductQty: number
  deductUnit: 'stock' | 'purchase'
  station: string
}

export type RestockSuggestion = {
  productId: string
  productName: string
  category: string
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  suggestedQty: number
  suggestedQtyDisplay: string
  onHand: number
  onOrder: number
  urgency: 'critical' | 'soon' | 'ok'
  source: 'history' | 'par' | 'unknown'
  sampleSize: number
  ratePerGuest: number | null
  coverDays: number | null
  pricePerStockUnit: number | null
}

export type TodayIssuanceStats = {
  todayCount: number
  yesterdayCount: number
  deltaPercent: number
}

export type RecentIssuance = {
  id: string
  productName: string
  stockUnit: string
  station: string | null
  createdAt: Date
  quantityStock: string
  method: string
}
