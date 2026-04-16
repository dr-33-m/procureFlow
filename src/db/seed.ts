import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

// Fixed UUIDs so .env can be pre-configured
const HOTEL_ID = '00000000-0000-0000-0000-000000000001'
const MANAGER_ID = '00000000-0000-0000-0000-000000000002'

async function main() {
  console.log('🌱 Seeding ProcureFlow database...')

  // ─── Hotel ────────────────────────────────────────────────────────────────
  const [hotel] = await db
    .insert(schema.hotels)
    .values({ id: HOTEL_ID, name: 'The Grand Palms Hotel' })
    .onConflictDoUpdate({ target: schema.hotels.id, set: { name: 'The Grand Palms Hotel' } })
    .returning()
  console.log(`✅ Hotel: ${hotel.name} (${hotel.id})`)

  // ─── Users ────────────────────────────────────────────────────────────────
  const [manager] = await db
    .insert(schema.users)
    .values({
      id: MANAGER_ID,
      hotelId: hotel.id,
      name: 'Marcus Vane',
      email: 'marcus@grandpalms.com',
      role: 'manager',
    })
    .onConflictDoUpdate({ target: schema.users.id, set: { name: 'Marcus Vane' } })
    .returning()

  const [runner] = await db
    .insert(schema.users)
    .values({
      hotelId: hotel.id,
      name: 'Jane Doe',
      email: 'jane@grandpalms.com',
      role: 'runner',
    })
    .returning()

  const [runner2] = await db
    .insert(schema.users)
    .values({
      hotelId: hotel.id,
      name: 'Marcus V.',
      email: 'marcusv@grandpalms.com',
      role: 'runner',
    })
    .returning()

  console.log(`✅ Users: ${manager.name}, ${runner.name}, ${runner2.name}`)

  // ─── Products ─────────────────────────────────────────────────────────────
  const productData = [
    // Proteins
    {
      name: 'Chicken Breast (Boneless)',
      unit: 'kg',
      category: 'Proteins',
      barcode: 'PRO-001',
    },
    {
      name: 'Beef Tenderloin',
      unit: 'kg',
      category: 'Proteins',
      barcode: 'PRO-002',
    },
    {
      name: 'Atlantic Salmon Fillet',
      unit: 'kg',
      category: 'Proteins',
      barcode: 'PRO-003',
    },
    // Produce
    {
      name: 'San Marzano Tomatoes',
      unit: 'Cases (6x1kg)',
      category: 'Produce',
      barcode: 'PRD-001',
    },
    {
      name: 'Mixed Salad Greens',
      unit: 'kg',
      category: 'Produce',
      barcode: 'PRD-002',
    },
    {
      name: 'Fresh Lemons',
      unit: 'Box',
      category: 'Produce',
      barcode: 'PRD-003',
    },
    // Dairy
    {
      name: 'Heavy Whipping Cream',
      unit: 'Litre',
      category: 'Dairy',
      barcode: 'DAI-001',
    },
    {
      name: 'Grade A Large Eggs (12ct)',
      unit: 'Cases',
      category: 'Dairy',
      barcode: 'DA-110-C',
    },
    {
      name: 'Whole Grade-A Milk',
      unit: 'Litre',
      category: 'Dairy',
      barcode: 'MK-33201',
    },
    {
      name: 'Unsalted Butter',
      unit: 'kg',
      category: 'Dairy',
      barcode: 'DAI-004',
    },
    // Dry Goods
    {
      name: 'Arborio Rice',
      unit: 'kg',
      category: 'Dry Goods',
      barcode: 'DRY-001',
    },
    {
      name: 'Extra Virgin Olive Oil',
      unit: 'Gallons',
      category: 'Dry Goods',
      barcode: 'DRY-002',
    },
    {
      name: 'All-Purpose Flour 50lb Bag',
      unit: 'Bags',
      category: 'Dry Goods',
      barcode: 'BA-004-F',
    },
    {
      name: 'Fine Granulated Sugar',
      unit: 'kg',
      category: 'Dry Goods',
      barcode: 'SG-10029',
    },
    // Beverages
    {
      name: 'Organic Whole Bean Coffee 5lb',
      unit: 'Units',
      category: 'Beverages',
      barcode: 'WF-902-X',
    },
    {
      name: 'Arabica Coffee Beans (Bulk)',
      unit: 'Box',
      category: 'Beverages',
      barcode: 'CB-90212',
    },
    {
      name: 'Biodegradable Napkins',
      unit: 'CTN',
      category: 'Dry Goods',
      barcode: 'NP-1122',
    },
  ]

  const insertedProducts = await db
    .insert(schema.products)
    .values(productData.map((p) => ({ ...p, hotelId: hotel.id })))
    .returning()

  const productMap = Object.fromEntries(insertedProducts.map((p) => [p.name, p]))
  console.log(`✅ Products: ${insertedProducts.length} inserted`)

  // ─── Shopping Lists ───────────────────────────────────────────────────────
  const [list1] = await db
    .insert(schema.shoppingLists)
    .values({
      hotelId: hotel.id,
      name: 'Weekly Produce Order',
      priority: 'normal',
      createdBy: manager.id,
      assignedTo: runner.id,
      status: 'pending',
      totalValue: '2450.00',
    })
    .returning()

  const [list2] = await db
    .insert(schema.shoppingLists)
    .values({
      hotelId: hotel.id,
      name: 'Dry Goods Refill',
      priority: 'urgent',
      createdBy: manager.id,
      assignedTo: runner2.id,
      status: 'in_progress',
      totalValue: '840.12',
      updatedAt: new Date(),
    })
    .returning()

  const [list3] = await db
    .insert(schema.shoppingLists)
    .values({
      hotelId: hotel.id,
      name: 'Protein & Dairy Stock-Up',
      priority: 'normal',
      createdBy: manager.id,
      assignedTo: runner.id,
      status: 'completed',
      totalValue: '3200.00',
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
      unitPrice: '45.00',
      status: 'pending',
    },
    {
      shoppingListId: list1.id,
      productId: productMap['Extra Virgin Olive Oil'].id,
      requestedQuantity: '5',
      unitPrice: '80.00',
      status: 'pending',
    },
    {
      shoppingListId: list1.id,
      productId: productMap['Mixed Salad Greens'].id,
      requestedQuantity: '8',
      unitPrice: '25.00',
      status: 'pending',
    },
    {
      shoppingListId: list2.id,
      productId: productMap['Arborio Rice'].id,
      requestedQuantity: '20',
      unitPrice: '12.00',
      status: 'found',
      purchasedQuantity: '20',
    },
    {
      shoppingListId: list2.id,
      productId: productMap['All-Purpose Flour 50lb Bag'].id,
      requestedQuantity: '10',
      unitPrice: '38.00',
      status: 'partial',
      purchasedQuantity: '7',
    },
    {
      shoppingListId: list3.id,
      productId: productMap['Chicken Breast (Boneless)'].id,
      requestedQuantity: '30',
      unitPrice: '15.00',
      status: 'found',
      purchasedQuantity: '30',
    },
    {
      shoppingListId: list3.id,
      productId: productMap['Grade A Large Eggs (12ct)'].id,
      requestedQuantity: '50',
      unitPrice: '8.50',
      status: 'found',
      purchasedQuantity: '48',
    },
    {
      shoppingListId: list3.id,
      productId: productMap['Unsalted Butter'].id,
      requestedQuantity: '15',
      unitPrice: '12.00',
      status: 'found',
      purchasedQuantity: '15',
    },
  ])
  console.log(`✅ Shopping List Items: 8 inserted`)

  // ─── Receiving Batch ──────────────────────────────────────────────────────
  const [batch] = await db
    .insert(schema.receivingBatches)
    .values({
      hotelId: hotel.id,
      batchRef: 'PF-RE-8921',
      supplierName: 'Prime Logistics Co.',
      shoppingListId: list3.id,
      createdBy: manager.id,
      status: 'unverified',
    })
    .returning()

  await db.insert(schema.receivingItems).values([
    {
      batchId: batch.id,
      productId: productMap['Organic Whole Bean Coffee 5lb'].id,
      expectedQuantity: '20',
      receivedQuantity: '20',
    },
    {
      batchId: batch.id,
      productId: productMap['Grade A Large Eggs (12ct)'].id,
      expectedQuantity: '50',
      receivedQuantity: '48',
    },
    {
      batchId: batch.id,
      productId: productMap['All-Purpose Flour 50lb Bag'].id,
      expectedQuantity: '10',
      receivedQuantity: '10',
    },
    {
      batchId: batch.id,
      productId: productMap['Chicken Breast (Boneless)'].id,
      expectedQuantity: '30',
      receivedQuantity: '30',
    },
    {
      batchId: batch.id,
      productId: productMap['Beef Tenderloin'].id,
      expectedQuantity: '15',
      receivedQuantity: '15',
    },
    {
      batchId: batch.id,
      productId: productMap['Atlantic Salmon Fillet'].id,
      expectedQuantity: '12',
      receivedQuantity: '10',
    },
    {
      batchId: batch.id,
      productId: productMap['Heavy Whipping Cream'].id,
      expectedQuantity: '24',
      receivedQuantity: '24',
    },
    {
      batchId: batch.id,
      productId: productMap['Unsalted Butter'].id,
      expectedQuantity: '15',
      receivedQuantity: '15',
    },
  ])
  console.log(`✅ Receiving Batch ${batch.batchRef}: 8 items`)

  // ─── Inventory ────────────────────────────────────────────────────────────
  const inventoryData = [
    { name: 'Chicken Breast (Boneless)', quantity: '45' },
    { name: 'Beef Tenderloin', quantity: '20' },
    { name: 'Atlantic Salmon Fillet', quantity: '8' },
    { name: 'San Marzano Tomatoes', quantity: '30' },
    { name: 'Mixed Salad Greens', quantity: '15' },
    { name: 'Fresh Lemons', quantity: '5' }, // low stock
    { name: 'Heavy Whipping Cream', quantity: '36' },
    { name: 'Grade A Large Eggs (12ct)', quantity: '48' },
    { name: 'Whole Grade-A Milk', quantity: '1200' },
    { name: 'Unsalted Butter', quantity: '22' },
    { name: 'Arborio Rice', quantity: '60' },
    { name: 'Extra Virgin Olive Oil', quantity: '12' },
    { name: 'All-Purpose Flour 50lb Bag', quantity: '7' }, // low stock
    { name: 'Fine Granulated Sugar', quantity: '250' },
    { name: 'Organic Whole Bean Coffee 5lb', quantity: '20' },
    { name: 'Arabica Coffee Beans (Bulk)', quantity: '12' }, // low stock
    { name: 'Biodegradable Napkins', quantity: '0' }, // out of stock
  ]

  await db.insert(schema.inventory).values(
    inventoryData.map(({ name, quantity }) => ({
      hotelId: hotel.id,
      productId: productMap[name].id,
      quantity,
    })),
  )
  console.log(`✅ Inventory: ${inventoryData.length} rows`)

  // ─── Inventory Transactions ───────────────────────────────────────────────
  const txData = [
    { name: 'Balsamic Vinegar 2L', type: 'ISSUE', qty: '-3', method: 'manual', station: 'Pastry Section' },
    { name: 'All-Purpose Flour 50lb Bag', type: 'ISSUE', qty: '-12', method: 'scanner', station: 'Main Kitchen' },
    { name: 'Grade A Large Eggs (12ct)', type: 'ISSUE', qty: '-5', method: 'manual', station: 'Main Kitchen' },
    { name: 'Chicken Breast (Boneless)', type: 'RECEIVE', qty: '30', method: 'manual', station: null },
    { name: 'Beef Tenderloin', type: 'RECEIVE', qty: '15', method: 'manual', station: null },
    { name: 'Whole Grade-A Milk', type: 'RECEIVE', qty: '200', method: 'manual', station: null },
    { name: 'Arborio Rice', type: 'ISSUE', qty: '-8', method: 'manual', station: 'Main Kitchen' },
    { name: 'Extra Virgin Olive Oil', type: 'ISSUE', qty: '-2', method: 'scanner', station: 'Pastry Section' },
  ]

  // Only insert transactions for products that exist in our map
  const validTxData = txData.filter(({ name }) => productMap[name])
  if (validTxData.length > 0) {
    await db.insert(schema.inventoryTransactions).values(
      validTxData.map(({ name, type, qty, method, station }) => ({
        hotelId: hotel.id,
        productId: productMap[name].id,
        type,
        quantity: qty,
        method,
        station,
        createdBy: manager.id,
      })),
    )
  }

  console.log(`✅ Inventory Transactions: inserted`)

  console.log('\n✨ Seed complete!')
  console.log(`\n📋 Summary:`)
  console.log(`   Hotel ID: ${hotel.id}`)
  console.log(`   Manager ID: ${manager.id}`)
  console.log(`   Runner ID: ${runner.id}`)
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
