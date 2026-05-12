import type {
  companies,
  branches,
  users,
  companyMembers,
  branchMembers,
  inviteTokens,
  products,
  productSuppliers,
  productPriceHistory,
  shoppingLists,
  shoppingListItems,
  inventory,
  inventoryTransactions,
} from '@/db/schema'

// ─── Base types from schema ──────────────────────────────────────────────────

export type Company = typeof companies.$inferSelect
export type Branch = typeof branches.$inferSelect
export type User = typeof users.$inferSelect
export type CompanyMember = typeof companyMembers.$inferSelect
export type BranchMember = typeof branchMembers.$inferSelect
export type InviteToken = typeof inviteTokens.$inferSelect
export type Product = typeof products.$inferSelect
export type ProductSupplier = typeof productSuppliers.$inferSelect
export type ProductPriceHistory = typeof productPriceHistory.$inferSelect
export type ShoppingList = typeof shoppingLists.$inferSelect
export type ShoppingListItem = typeof shoppingListItems.$inferSelect
export type Inventory = typeof inventory.$inferSelect
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect

// ─── Roles ──────────────────────────────────────────────────────────────────

export type CompanyRole = 'owner' | 'admin'
export type BranchRole = 'chef' | 'runner'
export type UserRole = CompanyRole | BranchRole

// ─── Packaging fields (denormalized into compound types) ─────────────────────

export interface ProductPackagingFields {
  stockUnit: string
  purchaseUnit: string | null
  purchasePackSize: string | null
  purchasePrice: string | null
  baseUnit: string | null
  baseUnitsPerStock: string | null
  servingUnit: string | null
  servingSize: string | null
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
  parPerGuestUnit: string | null
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

// ─── Auth context ───────────────────────────────────────────────────────────

export type AuthContext = {
  userId: string
  userName: string
  userEmail: string
  userRole: UserRole
  companyId: string
  defaultBranchId: string
}

// ─── Tier usage ─────────────────────────────────────────────────────────────

export type TierUsage = {
  tier: string
  usage: { branches: number; users: number; stations: number; products: number }
  limits: { branches: number; users: number; stations: number; products: number }
}

// ─── Member types ───────────────────────────────────────────────────────────

export type MemberWithDetails = {
  id: string
  userId: string
  userName: string
  userEmail: string
  userAvatar: string | null
  role: UserRole
  level: 'company' | 'branch'
  branchId: string | null
  branchName: string | null
  createdAt: Date
}

// ─── AI Shopping types ──────────────────────────────────────────────────────

export type AIChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AIToolCallInfo = {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any> | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: Record<string, any> | null
}

export type AISuggestedItem = {
  productId: string
  productName: string
  category: string
  quantity: number
  stockUnit: string
  purchaseUnit?: string
  purchasePackSize?: number
  pricePerStockUnit: number
  reason: string
  urgency: 'critical' | 'soon' | 'ok'
}

export type AIShoppingListSuggestion = {
  summary: string
  items: AISuggestedItem[]
  totalEstimatedCost: number
}

export type AIChatResponse = {
  message: AIChatMessage
  toolCalls: AIToolCallInfo[]
  suggestion: AIShoppingListSuggestion | null
}
