export type CompanyRole = 'owner' | 'admin'
export type BranchRole = 'chef' | 'runner'
export type UserRole = CompanyRole | BranchRole

// Unit levels used for quantity entry and supplier pricing.
// 'purchase' = case/box, 'stock' = the kitchen-issue unit, 'base' = ml/g/slice.
export type PricingUnit = 'purchase' | 'stock' | 'base'

// Urgency tags returned by getRestockSuggestions.
export type RestockUrgency = 'critical' | 'soon' | 'ok'

// Source of a restock suggestion. 'recipe-derived' is a par seeded from menu
// recipes at onboarding — a cold-start estimate, flagged distinctly from a
// hand-entered 'par' so the manager treats it with appropriate caution.
export type SuggestionSource = 'history' | 'par' | 'recipe-derived' | 'unknown'
export type ListStatus = 'draft' | 'pending' | 'shopping' | 'in_review' | 'on_hold' | 'completed'
export type ItemStatus = 'pending' | 'found' | 'not_found' | 'partial'
export type TxType = 'RECEIVE' | 'ISSUE'
export type Priority = 'normal' | 'urgent'
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type ReceivingItemStatus = 'matched' | 'shortage' | 'pending' | 'surplus'
