import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import bcrypt from 'bcryptjs'
import * as schema from '../src/db/schema'
import path from 'path'
import fs from 'fs'
import { count } from 'drizzle-orm'

const dbDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(path.join(dbDir, 'pmm.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

async function seed() {
  // Check if already seeded
  const [{ value: userCount }] = db.select({ value: count() }).from(schema.users).all()
  if (userCount > 0) {
    console.log('Database already seeded. Skipping.')
    return
  }

  console.log('Seeding database...')

  const passwordHash = await bcrypt.hash('admin123', 10)
  const [admin] = db.insert(schema.users).values({
    name: 'Admin',
    email: 'admin@pmm.local',
    passwordHash,
    role: 'admin',
  }).returning().all()

  console.log(`Created admin: ${admin.email}`)

  const cats = db.insert(schema.categories).values([
    { name: 'Electronics', description: 'Electronic components and devices' },
    { name: 'Office Supplies', description: 'General office supplies' },
    { name: 'Tools', description: 'Hand tools and power tools' },
    { name: 'Cables', description: 'Various cables and connectors' },
  ]).returning().all()

  const locs = db.insert(schema.locations).values([
    { name: 'Warehouse A', description: 'Main warehouse' },
    { name: 'Warehouse B', description: 'Secondary storage' },
    { name: 'Office 201', description: 'Main office' },
    { name: 'Office 202', description: 'Meeting room storage' },
  ]).returning().all()

  const items = db.insert(schema.items).values([
    { name: 'USB-C Cable', sku: 'PMM-00001', barcode: '012345678905', categoryId: cats[3].id, locationId: locs[0].id, quantity: 50, minQuantity: 10, unitCost: 4.99, unit: 'pcs' },
    { name: 'Whiteboard Marker', sku: 'PMM-00002', categoryId: cats[1].id, locationId: locs[2].id, quantity: 24, minQuantity: 5, unitCost: 1.5, unit: 'pcs' },
    { name: 'Cordless Drill', sku: 'PMM-00003', categoryId: cats[2].id, locationId: locs[0].id, quantity: 3, minQuantity: 1, unitCost: 89.99, unit: 'pcs' },
    { name: 'A4 Paper', sku: 'PMM-00004', categoryId: cats[1].id, locationId: locs[2].id, quantity: 15, minQuantity: 5, unitCost: 6.99, unit: 'reams' },
    { name: 'HDMI Cable', sku: 'PMM-00005', barcode: '098765432101', categoryId: cats[3].id, locationId: locs[0].id, quantity: 30, minQuantity: 5, unitCost: 8.99, unit: 'pcs' },
    { name: 'Wireless Mouse', sku: 'PMM-00006', categoryId: cats[0].id, locationId: locs[2].id, quantity: 8, minQuantity: 3, unitCost: 24.99, unit: 'pcs' },
    { name: 'Screwdriver Set', sku: 'PMM-00007', categoryId: cats[2].id, locationId: locs[0].id, quantity: 5, minQuantity: 2, unitCost: 19.99, unit: 'sets' },
    { name: 'Sticky Notes', sku: 'PMM-00008', categoryId: cats[1].id, locationId: locs[2].id, quantity: 2, minQuantity: 5, unitCost: 3.49, unit: 'packs' },
  ]).returning().all()

  db.insert(schema.transactions).values([
    { itemId: items[0].id, type: 'IN', quantity: 50, note: 'Initial stock', performedBy: admin.id },
    { itemId: items[1].id, type: 'IN', quantity: 30, note: 'Initial stock', performedBy: admin.id },
    { itemId: items[1].id, type: 'OUT', quantity: 6, note: 'Office use', performedBy: admin.id },
    { itemId: items[7].id, type: 'IN', quantity: 10, note: 'Restocked', performedBy: admin.id },
    { itemId: items[7].id, type: 'OUT', quantity: 8, note: 'Distributed', performedBy: admin.id },
  ]).run()

  console.log(`Created ${cats.length} categories, ${locs.length} locations, ${items.length} items, 5 transactions`)
  console.log('\nLogin: admin@pmm.local / admin123')
}

seed()
