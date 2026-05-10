import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

// Fixed UUIDs so .env can be pre-configured
const COMPANY_ID = '00000000-0000-0000-0000-000000000000'
const BRANCH_ID = '00000000-0000-0000-0000-000000000001'
const OWNER_ID = '00000000-0000-0000-0000-000000000002'

async function main() {
  console.log('🌱 Seeding ProcureFlow database...')

  // Clear existing data (cascade from branch handles most tables)
  await db.delete(schema.inventoryTransactions)
  await db.delete(schema.inventory)
  await db.delete(schema.shoppingListItems)
  await db.delete(schema.shoppingLists)
  await db.delete(schema.stations)
  await db.delete(schema.productSuppliers)
  await db.delete(schema.products)
  await db.delete(schema.branchMembers)
  await db.delete(schema.companyMembers)
  await db.delete(schema.users)
  await db.delete(schema.branches)
  await db.delete(schema.companies)
  console.log('🗑️  Cleared existing data')

  // ─── Company ──────────────────────────────────────────────────────────────
  const [company] = await db
    .insert(schema.companies)
    .values({ id: COMPANY_ID, name: 'The Grand Palms Hotel', bio: 'Luxury resort & fine dining', tier: 'starter' })
    .onConflictDoUpdate({ target: schema.companies.id, set: { name: 'The Grand Palms Hotel' } })
    .returning()
  console.log(`✅ Company: ${company.name} (${company.id})`)

  // ─── Branch ───────────────────────────────────────────────────────────────
  const [branch] = await db
    .insert(schema.branches)
    .values({ id: BRANCH_ID, companyId: company.id, name: 'Main Kitchen' })
    .onConflictDoUpdate({ target: schema.branches.id, set: { name: 'Main Kitchen' } })
    .returning()
  console.log(`✅ Branch: ${branch.name} (${branch.id})`)

  // ─── Users ────────────────────────────────────────────────────────────────
  const [owner] = await db
    .insert(schema.users)
    .values({
      id: OWNER_ID,
      name: 'Marcus Vane',
      email: 'marcus@grandpalms.com',
    })
    .onConflictDoUpdate({ target: schema.users.id, set: { name: 'Marcus Vane' } })
    .returning()

  const [runner] = await db
    .insert(schema.users)
    .values({
      name: 'Jane Doe',
      email: 'jane@grandpalms.com',
    })
    .returning()

  const [runner2] = await db
    .insert(schema.users)
    .values({
      name: 'Marcus V.',
      email: 'marcusv@grandpalms.com',
    })
    .returning()

  console.log(`✅ Users: ${owner.name}, ${runner.name}, ${runner2.name}`)

  // ─── Memberships ──────────────────────────────────────────────────────────
  await db.insert(schema.companyMembers).values({
    companyId: company.id,
    userId: owner.id,
    role: 'owner',
  })

  await db.insert(schema.branchMembers).values([
    { branchId: branch.id, userId: runner.id, role: 'runner' },
    { branchId: branch.id, userId: runner2.id, role: 'runner' },
  ])
  console.log(`✅ Memberships: owner + 2 runners`)

  // ─── Products (packaging-aware) ───────────────────────────────────────────
  const productData = [
    // Proteins — simple: stockUnit only, purchasePrice = per stock unit
    { name: 'Chicken Breast (Boneless)', stockUnit: 'kg', category: 'Proteins', barcode: 'PRO-001', parPerGuest: '0.25', purchasePrice: '8.50', supplierName: 'Prime Logistics Co.' },
    { name: 'Beef Tenderloin', stockUnit: 'kg', category: 'Proteins', barcode: 'PRO-002', parPerGuest: '0.20', purchasePrice: '22.00', supplierName: 'Prime Logistics Co.' },
    { name: 'Atlantic Salmon Fillet', stockUnit: 'kg', category: 'Proteins', barcode: 'PRO-003', parPerGuest: '0.18', purchasePrice: '18.50', supplierName: 'Ocean Fresh Distributors' },
    // Produce — case packaging
    { name: 'San Marzano Tomatoes', stockUnit: 'can', category: 'Produce', barcode: 'PRD-001', parPerGuest: '0.10', purchaseUnit: 'case', purchasePackSize: '6', purchasePrice: '45.00', baseUnit: 'kg', baseUnitsPerStock: '1', supplierName: 'FreshFarm Supplies' },
    { name: 'Mixed Salad Greens', stockUnit: 'kg', category: 'Produce', barcode: 'PRD-002', parPerGuest: '0.08', purchasePrice: '6.50', supplierName: 'FreshFarm Supplies' },
    { name: 'Fresh Lemons', stockUnit: 'each', category: 'Produce', barcode: 'PRD-003', parPerGuest: '0.05', purchaseUnit: 'box', purchasePackSize: '50', purchasePrice: '28.00', supplierName: 'FreshFarm Supplies' },
    // Dairy — bottle/case with base units
    { name: 'Heavy Whipping Cream', stockUnit: 'litre', category: 'Dairy', barcode: 'DAI-001', parPerGuest: '0.12', purchasePrice: '4.20', baseUnit: 'ml', baseUnitsPerStock: '1000', supplierName: 'Grand Dairy Co.' },
    { name: 'Grade A Large Eggs (12ct)', stockUnit: 'dozen', category: 'Dairy', barcode: 'DA-110-C', parPerGuest: '0.50', purchaseUnit: 'case', purchasePackSize: '4', purchasePrice: '34.00', supplierName: 'Grand Dairy Co.' },
    { name: 'Whole Grade-A Milk', stockUnit: 'bottle', category: 'Dairy', barcode: 'MK-33201', parPerGuest: '0.30', purchaseUnit: 'case', purchasePackSize: '20', purchasePrice: '15.00', baseUnit: 'ml', baseUnitsPerStock: '500', supplierName: 'Grand Dairy Co.' },
    { name: 'Unsalted Butter', stockUnit: 'kg', category: 'Dairy', barcode: 'DAI-004', parPerGuest: '0.08', purchasePrice: '12.00', supplierName: 'Grand Dairy Co.' },
    // Dry Goods — bag with base unit
    { name: 'Arborio Rice', stockUnit: 'kg', category: 'Dry Goods', barcode: 'DRY-001', parPerGuest: '0.15', purchasePrice: '3.80', supplierName: 'Pantry Direct' },
    { name: 'Extra Virgin Olive Oil', stockUnit: 'gallon', category: 'Dry Goods', barcode: 'DRY-002', parPerGuest: '0.02', purchasePrice: '32.00', baseUnit: 'ml', baseUnitsPerStock: '3785', supplierName: 'Pantry Direct' },
    { name: 'All-Purpose Flour 50lb Bag', stockUnit: 'bag', category: 'Dry Goods', barcode: 'BA-004-F', parPerGuest: '0.10', purchasePrice: '38.00', baseUnit: 'lb', baseUnitsPerStock: '50', supplierName: 'Pantry Direct' },
    { name: 'Fine Granulated Sugar', stockUnit: 'kg', category: 'Dry Goods', barcode: 'SG-10029', parPerGuest: '0.06', purchasePrice: '2.40', supplierName: 'Pantry Direct' },
    // Beverages
    { name: 'Organic Whole Bean Coffee 5lb', stockUnit: 'bag', category: 'Beverages', barcode: 'WF-902-X', parPerGuest: '0.04', purchasePrice: '42.00', baseUnit: 'lb', baseUnitsPerStock: '5', supplierName: 'BevPro Wholesale' },
    { name: 'Arabica Coffee Beans (Bulk)', stockUnit: 'box', category: 'Beverages', barcode: 'CB-90212', parPerGuest: '0.03', purchasePrice: '58.00', baseUnit: 'kg', baseUnitsPerStock: '5', supplierName: 'BevPro Wholesale' },
    { name: 'Biodegradable Napkins', stockUnit: 'carton', category: 'Dry Goods', barcode: 'NP-1122', parPerGuest: null, purchasePrice: '14.00', supplierName: 'Pantry Direct' },
  ]

  const insertedProducts = await db
    .insert(schema.products)
    .values(productData.map(({ supplierName, ...p }) => ({
      branchId: branch.id,
      name: p.name,
      stockUnit: p.stockUnit,
      category: p.category,
      barcode: p.barcode,
      parPerGuest: p.parPerGuest,
      purchaseUnit: ('purchaseUnit' in p && p.purchaseUnit) ? p.purchaseUnit : null,
      purchasePackSize: ('purchasePackSize' in p && p.purchasePackSize) ? p.purchasePackSize : null,
      purchasePrice: p.purchasePrice,
      baseUnit: ('baseUnit' in p && p.baseUnit) ? p.baseUnit : null,
      baseUnitsPerStock: ('baseUnitsPerStock' in p && p.baseUnitsPerStock) ? p.baseUnitsPerStock : null,
    })))
    .returning()

  const productMap = Object.fromEntries(insertedProducts.map((p) => [p.name, p]))
  console.log(`✅ Products: ${insertedProducts.length} inserted`)

  // ─── Product Suppliers ────────────────────────────────────────────────────
  await db.insert(schema.productSuppliers).values(
    productData.map((p) => ({
      productId: productMap[p.name].id,
      name: p.supplierName,
      pricePerUnit: p.purchasePrice,
    })),
  )
  console.log(`✅ Product Suppliers: ${productData.length} inserted`)

  // ─── Shopping Lists ───────────────────────────────────────────────────────
  const [list1] = await db
    .insert(schema.shoppingLists)
    .values({
      branchId: branch.id,
      name: 'Weekly Produce Order',
      priority: 'normal',
      createdBy: owner.id,
      assignedTo: runner.id,
      status: 'pending',
      totalValue: '2450.00',
    })
    .returning()

  const [list2] = await db
    .insert(schema.shoppingLists)
    .values({
      branchId: branch.id,
      name: 'Dry Goods Refill',
      priority: 'urgent',
      createdBy: owner.id,
      assignedTo: runner2.id,
      status: 'in_review',
      totalValue: '840.12',
      updatedAt: new Date(),
    })
    .returning()

  const [list3] = await db
    .insert(schema.shoppingLists)
    .values({
      branchId: branch.id,
      name: 'Protein & Dairy Stock-Up',
      priority: 'normal',
      createdBy: owner.id,
      assignedTo: runner.id,
      status: 'completed',
      totalValue: '3200.00',
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .returning()

  console.log(`✅ Shopping Lists: 3 inserted`)

  // ─── Shopping List Items ──────────────────────────────────────────────────
  await db.insert(schema.shoppingListItems).values([
    {
      shoppingListId: list1.id,
      productId: productMap['San Marzano Tomatoes'].id,
      requestedQuantity: '12',
      pricePerStockUnit: '7.50',
      status: 'pending',
    },
    {
      shoppingListId: list1.id,
      productId: productMap['Extra Virgin Olive Oil'].id,
      requestedQuantity: '5',
      pricePerStockUnit: '32.00',
      status: 'pending',
    },
    {
      shoppingListId: list1.id,
      productId: productMap['Mixed Salad Greens'].id,
      requestedQuantity: '8',
      pricePerStockUnit: '6.50',
      status: 'pending',
    },
    {
      shoppingListId: list2.id,
      productId: productMap['Arborio Rice'].id,
      requestedQuantity: '20',
      pricePerStockUnit: '3.80',
      status: 'pending',
    },
    {
      shoppingListId: list2.id,
      productId: productMap['All-Purpose Flour 50lb Bag'].id,
      requestedQuantity: '10',
      pricePerStockUnit: '38.00',
      status: 'pending',
    },
    {
      shoppingListId: list3.id,
      productId: productMap['Chicken Breast (Boneless)'].id,
      requestedQuantity: '30',
      pricePerStockUnit: '8.50',
      status: 'found',
      purchasedQuantity: '30',
    },
    {
      shoppingListId: list3.id,
      productId: productMap['Grade A Large Eggs (12ct)'].id,
      requestedQuantity: '50',
      pricePerStockUnit: '8.50',
      status: 'found',
      purchasedQuantity: '48',
    },
    {
      shoppingListId: list3.id,
      productId: productMap['Unsalted Butter'].id,
      requestedQuantity: '15',
      pricePerStockUnit: '12.00',
      status: 'found',
      purchasedQuantity: '15',
    },
  ])
  console.log(`✅ Shopping List Items: 8 inserted`)

  // ─── Inventory ────────────────────────────────────────────────────────────
  const inventoryData = [
    { name: 'Chicken Breast (Boneless)', quantity: '45' },
    { name: 'Beef Tenderloin', quantity: '20' },
    { name: 'Atlantic Salmon Fillet', quantity: '8' },
    { name: 'San Marzano Tomatoes', quantity: '30' },
    { name: 'Mixed Salad Greens', quantity: '15' },
    { name: 'Fresh Lemons', quantity: '5' },
    { name: 'Heavy Whipping Cream', quantity: '36' },
    { name: 'Grade A Large Eggs (12ct)', quantity: '48' },
    { name: 'Whole Grade-A Milk', quantity: '120' },
    { name: 'Unsalted Butter', quantity: '22' },
    { name: 'Arborio Rice', quantity: '60' },
    { name: 'Extra Virgin Olive Oil', quantity: '12' },
    { name: 'All-Purpose Flour 50lb Bag', quantity: '7' },
    { name: 'Fine Granulated Sugar', quantity: '250' },
    { name: 'Organic Whole Bean Coffee 5lb', quantity: '20' },
    { name: 'Arabica Coffee Beans (Bulk)', quantity: '12' },
    { name: 'Biodegradable Napkins', quantity: '0' },
  ]

  await db.insert(schema.inventory).values(
    inventoryData.map(({ name, quantity }) => ({
      branchId: branch.id,
      productId: productMap[name].id,
      quantity,
    })),
  )
  console.log(`✅ Inventory: ${inventoryData.length} rows`)

  // ─── Inventory Transactions ───────────────────────────────────────────────
  const txData = [
    { name: 'All-Purpose Flour 50lb Bag', type: 'ISSUE', qty: '-12', method: 'scanner', station: 'Main Kitchen' },
    { name: 'Grade A Large Eggs (12ct)', type: 'ISSUE', qty: '-5', method: 'manual', station: 'Main Kitchen' },
    { name: 'Chicken Breast (Boneless)', type: 'RECEIVE', qty: '30', method: 'manual', station: null },
    { name: 'Beef Tenderloin', type: 'RECEIVE', qty: '15', method: 'manual', station: null },
    { name: 'Whole Grade-A Milk', type: 'RECEIVE', qty: '20', method: 'manual', station: null },
    { name: 'Arborio Rice', type: 'ISSUE', qty: '-8', method: 'manual', station: 'Main Kitchen' },
    { name: 'Extra Virgin Olive Oil', type: 'ISSUE', qty: '-2', method: 'scanner', station: 'Pastry Section' },
    { name: 'Atlantic Salmon Fillet', type: 'ISSUE', qty: '-4', method: 'manual', station: 'Main Kitchen' },
  ]

  await db.insert(schema.inventoryTransactions).values(
    txData.map(({ name, type, qty, method, station }) => ({
      branchId: branch.id,
      productId: productMap[name].id,
      type,
      quantityStock: qty,
      unitAtEntry: 'stock',
      method,
      station,
      createdBy: owner.id,
    })),
  )
  console.log(`✅ Inventory Transactions: inserted`)

  // ─── Stations ─────────────────────────────────────────────────────────────
  await db.insert(schema.stations).values([
    { branchId: branch.id, name: 'Main Kitchen' },
    { branchId: branch.id, name: 'Pastry Section' },
    { branchId: branch.id, name: 'Pool Bar' },
  ])
  console.log(`✅ Stations: 3 inserted`)

  console.log('\n✨ Seed complete!')
  console.log(`\n📋 Summary:`)
  console.log(`   Company ID: ${company.id}`)
  console.log(`   Branch ID: ${branch.id}`)
  console.log(`   Owner ID: ${owner.id}`)
  console.log(`   Runner ID: ${runner.id}`)
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
