export type UserRole = 'manager' | 'runner'

// Unit levels used for quantity entry and supplier pricing.
// 'purchase' = case/box, 'stock' = the kitchen-issue unit, 'base' = ml/g/slice.
export type PricingUnit = 'purchase' | 'stock' | 'base'

// Urgency tags returned by getRestockSuggestions.
export type RestockUrgency = 'critical' | 'soon' | 'ok'

// Source of a restock suggestion.
export type SuggestionSource = 'history' | 'par' | 'unknown'
export type ListStatus = 'draft' | 'pending' | 'shopping' | 'in_review' | 'on_hold' | 'completed'
export type ItemStatus = 'pending' | 'found' | 'not_found' | 'partial'
export type TxType = 'RECEIVE' | 'ISSUE'
export type Priority = 'normal' | 'urgent'
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type ReceivingItemStatus = 'matched' | 'shortage' | 'pending' | 'surplus'
