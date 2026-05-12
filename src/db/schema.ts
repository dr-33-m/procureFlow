import {
  pgTable,
  uuid,
  text,
  timestamp,
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
