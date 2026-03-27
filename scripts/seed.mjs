/**
 * seed.mjs — Standalone seed script for Docker.
 * Uses better-sqlite3 and bcryptjs directly — no drizzle, no tsx needed.
 * Idempotent: checks if users table has any rows before inserting.
 */

import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

// Resolve DB path from DATABASE_URL env var or fall back to default
function resolveDbPath() {
  const url = process.env.DATABASE_URL || 'file:/app/data/pmm.db'
  return url.replace(/^file:/, '')
}

const dbPath = resolveDbPath()
const dbDir = dirname(dbPath)

// Ensure the data directory exists
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

async function seed() {
  // Check if already seeded
  const { userCount } = db.prepare('SELECT COUNT(*) AS userCount FROM users').get()
  if (userCount > 0) {
    console.log('Database already seeded. Skipping.')
    db.close()
    return
  }

  console.log('Seeding database...')

  // --- Users ---
  const passwordHash = await bcrypt.hash('admin123', 10)
  const adminResult = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       RETURNING id, email`
    )
    .get('Admin', 'admin@pmm.local', passwordHash, 'admin')

  console.log(`Created admin: ${adminResult.email}`)

  // --- Categories ---
  const insertCategory = db.prepare(
    `INSERT INTO categories (name, description) VALUES (?, ?) RETURNING id`
  )

  const catElectronics = insertCategory.get('Electronics', 'Electronic components and devices')
  const catOffice = insertCategory.get('Office Supplies', 'General office supplies')
  const catTools = insertCategory.get('Tools', 'Hand tools and power tools')
  const catCables = insertCategory.get('Cables', 'Various cables and connectors')

  const cats = [catElectronics, catOffice, catTools, catCables]

  // --- Locations ---
  const insertLocation = db.prepare(
    `INSERT INTO locations (name, description) VALUES (?, ?) RETURNING id`
  )

  const locWarehouseA = insertLocation.get('Warehouse A', 'Main warehouse')
  const locWarehouseB = insertLocation.get('Warehouse B', 'Secondary storage')
  const locOffice201 = insertLocation.get('Office 201', 'Main office')
  const locOffice202 = insertLocation.get('Office 202', 'Meeting room storage')

  const locs = [locWarehouseA, locWarehouseB, locOffice201, locOffice202]

  // --- Items ---
  const insertItem = db.prepare(
    `INSERT INTO items (name, sku, barcode, category_id, location_id, quantity, min_quantity, unit_cost, unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  )

  const itemsData = [
    ['USB-C Cable',       'PMM-00001', '012345678905', cats[3].id, locs[0].id, 50, 10, 4.99,  'pcs'],
    ['Whiteboard Marker', 'PMM-00002', null,           cats[1].id, locs[2].id, 24,  5, 1.50,  'pcs'],
    ['Cordless Drill',    'PMM-00003', null,           cats[2].id, locs[0].id,  3,  1, 89.99, 'pcs'],
    ['A4 Paper',          'PMM-00004', null,           cats[1].id, locs[2].id, 15,  5, 6.99,  'reams'],
    ['HDMI Cable',        'PMM-00005', '098765432101', cats[3].id, locs[0].id, 30,  5, 8.99,  'pcs'],
    ['Wireless Mouse',    'PMM-00006', null,           cats[0].id, locs[2].id,  8,  3, 24.99, 'pcs'],
    ['Screwdriver Set',   'PMM-00007', null,           cats[2].id, locs[0].id,  5,  2, 19.99, 'sets'],
    ['Sticky Notes',      'PMM-00008', null,           cats[1].id, locs[2].id,  2,  5, 3.49,  'packs'],
  ]

  const items = itemsData.map(([name, sku, barcode, catId, locId, qty, minQty, cost, unit]) =>
    insertItem.get(name, sku, barcode, catId, locId, qty, minQty, cost, unit)
  )

  // --- Transactions ---
  const insertTx = db.prepare(
    `INSERT INTO transactions (item_id, type, quantity, note, performed_by)
     VALUES (?, ?, ?, ?, ?)`
  )

  const seedTransactions = db.transaction(() => {
    insertTx.run(items[0].id, 'IN',  50, 'Initial stock',  adminResult.id)
    insertTx.run(items[1].id, 'IN',  30, 'Initial stock',  adminResult.id)
    insertTx.run(items[1].id, 'OUT',  6, 'Office use',     adminResult.id)
    insertTx.run(items[7].id, 'IN',  10, 'Restocked',      adminResult.id)
    insertTx.run(items[7].id, 'OUT',  8, 'Distributed',    adminResult.id)
  })
  seedTransactions()

  console.log(`Created ${cats.length} categories, ${locs.length} locations, ${items.length} items, 5 transactions`)
  console.log('\nLogin: admin@pmm.local / admin123')

  db.close()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
