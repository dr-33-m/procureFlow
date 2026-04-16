import type {
  hotels,
  users,
  products,
  shoppingLists,
  shoppingListItems,
  receivingBatches,
  receivingItems,
  inventory,
  inventoryTransactions,
} from '@/db/schema'

// ─── Base types from schema ──────────────────────────────────────────────────

export type Hotel = typeof hotels.$inferSelect
export type User = typeof users.$inferSelect
export type Product = typeof products.$inferSelect
export type ShoppingList = typeof shoppingLists.$inferSelect
export type ShoppingListItem = typeof shoppingListItems.$inferSelect
export type ReceivingBatch = typeof receivingBatches.$inferSelect
export type ReceivingItem = typeof receivingItems.$inferSelect
export type Inventory = typeof inventory.$inferSelect
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect

// ─── Compound types ──────────────────────────────────────────────────────────

export type ShoppingListWithDetails = ShoppingList & {
  creatorName: string | null
  runnerName: string | null
  itemCount: number
}

export type ShoppingListItemWithProduct = ShoppingListItem & {
  productName: string
  productUnit: string
}

export type BatchWithItems = ReceivingBatch & {
  items: (ReceivingItem & {
    productName: string
    productUnit: string
    productCategory: string
    productBarcode: string | null
  })[]
  totalItems: number
  verifiedItems: number
}

export type InventoryWithProduct = Inventory & {
  productName: string
  productUnit: string
  productCategory: string
  productSku: string | null
}

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
  productUnit: string
  currentQty: number
  deductQty: number
  station: string
}

export type TodayIssuanceStats = {
  todayCount: number
  yesterdayCount: number
  deltaPercent: number
}

export type RecentIssuance = {
  id: string
  productName: string
  station: string | null
  createdAt: Date
  quantity: string
  method: string
}
