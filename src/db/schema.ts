import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ─── Hotels ─────────────────────────────────────────────────────────────────

export const hotels = pgTable('hotels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  hotelId: uuid('hotel_id')
    .notNull()
    .references(() => hotels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Products ───────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hotelId: uuid('hotel_id')
      .notNull()
      .references(() => hotels.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    unit: text('unit').notNull(),
    category: text('category').notNull().default('General'),
    barcode: text('barcode').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('idx_products_barcode').on(t.barcode)],
)

// ─── Shopping Lists ──────────────────────────────────────────────────────────

export const shoppingLists = pgTable('shopping_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  hotelId: uuid('hotel_id')
    .notNull()
    .references(() => hotels.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Untitled List'),
  priority: text('priority').notNull().default('normal'),
  createdBy: uuid('created_by').references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  status: text('status').notNull().default('pending'),
  totalValue: numeric('total_value', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  completedAt: timestamp('completed_at'),
})

// ─── Shopping List Items ─────────────────────────────────────────────────────

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
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).default('0'),
  status: text('status').notNull().default('pending'),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
})

// ─── Receiving Batches ───────────────────────────────────────────────────────

export const receivingBatches = pgTable('receiving_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  hotelId: uuid('hotel_id')
    .notNull()
    .references(() => hotels.id, { onDelete: 'cascade' }),
  batchRef: text('batch_ref').notNull(),
  supplierName: text('supplier_name').notNull().default('Unknown Supplier'),
  shoppingListId: uuid('shopping_list_id').references(() => shoppingLists.id),
  createdBy: uuid('created_by').references(() => users.id),
  status: text('status').notNull().default('unverified'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Receiving Items ─────────────────────────────────────────────────────────

export const receivingItems = pgTable('receiving_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id')
    .notNull()
    .references(() => receivingBatches.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  expectedQuantity: numeric('expected_quantity', {
    precision: 10,
    scale: 2,
  }),
  receivedQuantity: numeric('received_quantity', {
    precision: 10,
    scale: 2,
  }),
  checkedBy: uuid('checked_by').references(() => users.id),
  checkedAt: timestamp('checked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Inventory ───────────────────────────────────────────────────────────────

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hotelId: uuid('hotel_id')
      .notNull()
      .references(() => hotels.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('inventory_hotel_product_unique').on(t.hotelId, t.productId),
    index('idx_inventory_product').on(t.productId),
    index('idx_inventory_hotel').on(t.hotelId),
  ],
)

// ─── Inventory Transactions ──────────────────────────────────────────────────

export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hotelId: uuid('hotel_id')
      .notNull()
      .references(() => hotels.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    type: text('type').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    referenceId: uuid('reference_id'),
    referenceType: text('reference_type'),
    method: text('method').notNull().default('manual'),
    station: text('station'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_transactions_product').on(t.productId),
    index('idx_transactions_hotel').on(t.hotelId),
  ],
)
