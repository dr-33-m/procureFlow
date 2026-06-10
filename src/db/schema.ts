import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  numeric,
  integer,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ─── Companies ──────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  bio: text('bio'),
  tier: text('tier').notNull().default('starter'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Branches (formerly Hotels) ─────────────────────────────────────────────

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  logtoId: text('logto_id').unique(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Company Members (owner / admin) ────────────────────────────────────────

export const companyMembers = pgTable(
  'company_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'owner' | 'admin'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('company_members_company_user_unique').on(t.companyId, t.userId),
  ],
)

// ─── Branch Members (chef / runner) ─────────────────────────────────────────

export const branchMembers = pgTable(
  'branch_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'chef' | 'runner'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('branch_members_branch_user_unique').on(t.branchId, t.userId),
  ],
)

// ─── Invite Tokens ──────────────────────────────────────────────────────────

export const inviteTokens = pgTable('invite_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'admin' | 'chef' | 'runner'
  token: text('token').unique().notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
})

// ─── Sessions ───────────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // random token
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: text('data').notNull(), // JSON blob for Logto tokens
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Products ───────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull().default('General'),
    barcode: text('barcode').unique(),
    parPerGuest: numeric('par_per_guest', { precision: 10, scale: 2 }),
    // 'stock' | 'base' — the unit parPerGuest is expressed in (e.g. 'base' lets
    // you say "2 slices/guest" for a loaf-with-slices product).
    parPerGuestUnit: text('par_per_guest_unit').default('stock'),
    // Provenance of parPerGuest so the UI can flag estimates rather than treat
    // them as truth: 'manual' (hand-entered), 'csv' (imported), 'recipe-derived'
    // (computed from menu recipes at onboarding — a low-confidence estimate that
    // the learning loop overrides once reconciliation data arrives).
    parSource: text('par_source').default('manual'),
    // Three-level packaging: PURCHASE (case/box) → STOCK (bottle/each) → BASE (ml/g).
    // stockUnit is the unit the kitchen physically issues at (e.g. loaf, bottle, kg).
    // Inventory and all transaction quantities are always in stockUnit. Convert
    // between levels via purchasePackSize and baseUnitsPerStock at write time.
    stockUnit: text('stock_unit').notNull(),
    purchaseUnit: text('purchase_unit'),
    purchasePackSize: numeric('purchase_pack_size', {
      precision: 10,
      scale: 4,
    }),
    purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
    baseUnit: text('base_unit'),
    baseUnitsPerStock: numeric('base_units_per_stock', {
      precision: 12,
      scale: 4,
    }),
    // Serving unit: a human-friendly alias for a specific quantity of base units.
    // e.g. servingUnit='glass', servingSize=250 means 1 glass = 250 ml (when baseUnit='ml').
    // Used so users can express par as "1 glass/guest" instead of "250 ml/guest".
    servingUnit: text('serving_unit'),
    servingSize: numeric('serving_size', { precision: 10, scale: 4 }),
    // Default supplier lead time in days (null → hotel default of 3d).
    leadTimeDays: integer('lead_time_days'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_products_barcode').on(t.barcode)],
)

// ─── Product Suppliers ────────────────────────────────────────────────────────

export const productSuppliers = pgTable('product_suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pricePerUnit: numeric('price_per_unit', { precision: 10, scale: 2 }),
  // 'purchase' | 'stock' | 'base' — which level pricePerUnit is expressed at.
  // e.g. pricePerUnit=12, priceUnit='purchase' means $12/box.
  priceUnit: text('price_unit').notNull().default('stock'),
  // Optional per-supplier lead time override (days).
  leadTimeDays: integer('lead_time_days'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Shopping Lists ──────────────────────────────────────────────────────────

export const shoppingLists = pgTable('shopping_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Untitled List'),
  priority: text('priority').notNull().default('normal'),
  createdBy: uuid('created_by').references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  status: text('status').notNull().default('pending'),
  totalValue: numeric('total_value', { precision: 10, scale: 2 }).default('0'),
  // Procurement cycle metadata. periodType is 'weekly' | 'biweekly' | 'monthly' | 'event'.
  periodType: text('period_type'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  expectedGuestCount: integer('expected_guest_count'),
  // Legacy single-day guest count (kept for back-compat with event-style lists).
  guestCount: integer('guest_count'),
  // Procurement-cycle demand decomposition. UI computes
  // expectedGuestCount = expectedDailyOccupancy × periodDays × mealsPerDayCount.
  expectedDailyOccupancy: integer('expected_daily_occupancy'),
  periodDays: integer('period_days'),
  mealsPerDayCount: integer('meals_per_day_count').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  completedAt: timestamp('completed_at'),
})

// ─── Shopping List Items ─────────────────────────────────────────────────────

// All quantity fields are interpreted in the product's stockUnit.
export const shoppingListItems = pgTable('shopping_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  shoppingListId: uuid('shopping_list_id')
    .notNull()
    .references(() => shoppingLists.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  requestedQuantity: numeric('requested_quantity', {
    precision: 10,
    scale: 2,
  }).notNull(),
  purchasedQuantity: numeric('purchased_quantity', {
    precision: 10,
    scale: 2,
  }).default('0'),
  receivedQuantity: numeric('received_quantity', {
    precision: 10,
    scale: 2,
  }).default('0'),
  pricePerStockUnit: numeric('price_per_stock_unit', {
    precision: 10,
    scale: 2,
  }).default('0'),
  status: text('status').notNull().default('pending'),
  // Audit: which unit the requester entered ('purchase' | 'stock'). Stored qty is always stock.
  requestedUnit: text('requested_unit').default('stock'),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
})

// ─── Inventory ───────────────────────────────────────────────────────────────

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('inventory_branch_product_unique').on(t.branchId, t.productId),
    index('idx_inventory_product').on(t.productId),
    index('idx_inventory_branch').on(t.branchId),
  ],
)

// ─── Stations ────────────────────────────────────────────────────────────────

export const stations = pgTable('stations', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Product Price History ───────────────────────────────────────────────────

// Append-only log of received prices. Written each time a shopping-list item is
// approved at receiving. Lets suggestions cost out at the latest real price and
// surfaces price trends to the manager.
export const productPriceHistory = pgTable(
  'product_price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    supplierId: uuid('supplier_id').references(() => productSuppliers.id, {
      onDelete: 'set null',
    }),
    // Always normalized to stock units for easy comparison across receives.
    pricePerStockUnit: numeric('price_per_stock_unit', {
      precision: 10,
      scale: 4,
    }).notNull(),
    source: text('source').notNull().default('receive'),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
  },
  (t) => [index('idx_price_history_product').on(t.productId)],
)

// ─── Inventory Transactions ──────────────────────────────────────────────────

export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    type: text('type').notNull(),
    // Canonical signed quantity in the product's stockUnit. Negative for ISSUE,
    // positive for RECEIVE. All historical analysis reads this column.
    quantityStock: numeric('quantity_stock', {
      precision: 12,
      scale: 4,
    }).notNull(),
    // Audit field: which level the user actually entered ('stock' | 'base' | 'purchase').
    unitAtEntry: text('unit_at_entry').notNull().default('stock'),
    // Number of guests served by this issuance (ISSUE only). Powers per-guest
    // consumption-rate forecasting. Null for RECEIVE rows.
    guestCount: integer('guest_count'),
    referenceId: uuid('reference_id'),
    referenceType: text('reference_type'),
    method: text('method').notNull().default('manual'),
    station: text('station'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_transactions_product').on(t.productId),
    index('idx_transactions_branch').on(t.branchId),
  ],
)

// ─── Menus ──────────────────────────────────────────────────────────────────

// A named meal slot a manager configures once and reuses. The mealType
// distinguishes daily-recurring services from one-off events; eventTag
// (e.g. 'wedding', 'conference') further segments the learned per-guest rate
// so a banquet doesn't pollute the weekday-dinner average.
export const menus = pgTable(
  'menus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mealType: text('meal_type').notNull(), // 'breakfast'|'lunch'|'dinner'|'drinks'|'event'
    eventTag: text('event_tag'),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [
    index('idx_menus_branch').on(t.branchId),
    index('idx_menus_meal_type').on(t.mealType),
  ],
)

// ─── Dishes ─────────────────────────────────────────────────────────────────

// A dish on a menu, with both a chef-facing description and a structured
// recipe (linked via dish_ingredients). defaultServingsPerGuest lets the
// agent represent shared sides (0.5) and expected reorder buffers (1.3+).
export const dishes = pgTable(
  'dishes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    defaultServingsPerGuest: numeric('default_servings_per_guest', {
      precision: 10,
      scale: 4,
    })
      .notNull()
      .default('1'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [index('idx_dishes_menu').on(t.menuId)],
)

// ─── Dish Ingredients ───────────────────────────────────────────────────────

// The structured recipe — product + quantity per serving. Unit semantics
// match the rest of the schema ('stock'|'base'|'serving'); conversion to
// stock for demand math goes through toStockQty() in server/lib/pricing.
// isSubstitutable lets the agent know a chef may swap (e.g. lettuce→cucumber).
export const dishIngredients = pgTable(
  'dish_ingredients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dishId: uuid('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityPerServing: numeric('quantity_per_serving', {
      precision: 10,
      scale: 4,
    }).notNull(),
    unit: text('unit').notNull().default('base'), // 'stock'|'base'|'serving'
    isSubstitutable: boolean('is_substitutable').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_dish_ingredients_dish').on(t.dishId),
    index('idx_dish_ingredients_product').on(t.productId),
  ],
)

// ─── Kitchen Stock ──────────────────────────────────────────────────────────

// Items issued from pantry into the kitchen buffer, awaiting EOD reconciliation.
// One row per (product, issuance event) — captures both planning context
// (expectedGuestCount, expectedServings, menuId, eventTag) and the link back
// to the original ISSUE transaction. status flips to 'reconciled' (or 'partial')
// when the chef closes the row out in Phase 3.
export const kitchenStock = pgTable(
  'kitchen_stock',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityIssued: numeric('quantity_issued', { precision: 12, scale: 4 }).notNull(),
    quantityRemaining: numeric('quantity_remaining', {
      precision: 12,
      scale: 4,
    }).notNull(),
    expectedGuestCount: integer('expected_guest_count'),
    expectedServings: integer('expected_servings'),
    menuId: uuid('menu_id'), // soft link — Phase 3 may add FK once data settles
    eventTag: text('event_tag'),
    sourceTransactionId: uuid('source_transaction_id'),
    status: text('status').notNull().default('pending'), // 'pending'|'reconciled'|'partial'
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
    reconciledAt: timestamp('reconciled_at'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (t) => [
    index('idx_kitchen_stock_branch_status').on(t.branchId, t.status),
    index('idx_kitchen_stock_product').on(t.productId),
    index('idx_kitchen_stock_issued_at').on(t.issuedAt),
  ],
)

// ─── Kitchen Reconciliations (chef EOD report) ──────────────────────────────

// One row per service the chef closes out. Carries the planning vs. reality
// gap (expectedGuestCount lives on kitchen_stock; this captures what actually
// happened). actualServings >= actualGuestCount when guests had seconds.
export const kitchenReconciliations = pgTable(
  'kitchen_reconciliations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    serviceDate: date('service_date').notNull(),
    mealType: text('meal_type').notNull(), // 'breakfast'|'lunch'|'dinner'|'drinks'|'event'
    eventTag: text('event_tag'),
    actualGuestCount: integer('actual_guest_count').notNull(),
    actualServings: integer('actual_servings').notNull(),
    // Generated column: actualServings / actualGuestCount. Reorder ratio
    // drives the issuance agent's buffer multiplier on future services.
    reorderRatio: numeric('reorder_ratio', { precision: 6, scale: 3 }),
    notes: text('notes'),
    reportedAt: timestamp('reported_at').defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_reconciliations_branch_meal').on(t.branchId, t.mealType),
    index('idx_reconciliations_service_date').on(t.serviceDate),
  ],
)

// One row per product reconciled. The single most important column for
// learning is `reason` — without it the system can't tell a real par shift
// from a one-off spike. perGuestUsedStock + perServingUsedStock are
// snapshots so analytics queries don't have to recompute.
export const kitchenReconciliationItems = pgTable(
  'kitchen_reconciliation_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reconciliationId: uuid('reconciliation_id')
      .notNull()
      .references(() => kitchenReconciliations.id, { onDelete: 'cascade' }),
    kitchenStockId: uuid('kitchen_stock_id'),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityUsed: numeric('quantity_used', { precision: 12, scale: 4 }).notNull(),
    quantityWaste: numeric('quantity_waste', { precision: 12, scale: 4 })
      .notNull()
      .default('0'),
    quantityLeftover: numeric('quantity_leftover', { precision: 12, scale: 4 })
      .notNull()
      .default('0'),
    // Structured reason codes — see system prompt for canonical list.
    reason: text('reason').notNull().default('normal'),
    reasonNotes: text('reason_notes'),
    perGuestUsedStock: numeric('per_guest_used_stock', {
      precision: 12,
      scale: 6,
    }),
    perServingUsedStock: numeric('per_serving_used_stock', {
      precision: 12,
      scale: 6,
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_reconciliation_items_product').on(t.productId),
    index('idx_reconciliation_items_recon').on(t.reconciliationId),
  ],
)

// ─── Product Batches (expiry tracking) ──────────────────────────────────────

// One row per receive event, FIFO-decremented on issue. inventory.quantity
// stays the fast-read aggregate; batches answer "what's expiring in N days".
// bestBefore is nullable — items without a date simply never trigger expiry
// alerts. sourceTransactionId is a soft link to the originating RECEIVE row.
export const productBatches = pgTable(
  'product_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantityStock: numeric('quantity_stock', {
      precision: 12,
      scale: 4,
    }).notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
    bestBefore: date('best_before'),
    sourceTransactionId: uuid('source_transaction_id'),
    isDepleted: boolean('is_depleted').notNull().default(false),
  },
  (t) => [
    index('idx_batches_product_branch').on(t.productId, t.branchId),
    index('idx_batches_best_before').on(t.bestBefore),
    index('idx_batches_active').on(t.isDepleted),
  ],
)
