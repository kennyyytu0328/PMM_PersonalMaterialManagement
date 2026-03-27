import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'staff', 'viewer'] }).notNull().default('staff'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  parentId: integer('parent_id').references((): any => categories.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  locationId: integer('location_id').references(() => locations.id),
  quantity: integer('quantity').notNull().default(0),
  minQuantity: integer('min_quantity'),
  unitCost: real('unit_cost'),
  unit: text('unit').notNull().default('pcs'),
  imageUrl: text('image_url'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id),
  type: text('type', { enum: ['IN', 'OUT', 'ADJUST'] }).notNull(),
  quantity: integer('quantity').notNull(),
  note: text('note'),
  performedBy: integer('performed_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const checkouts = sqliteTable('checkouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id),
  userId: integer('user_id').notNull().references(() => users.id),
  quantity: integer('quantity').notNull().default(1),
  checkedOutAt: text('checked_out_at').notNull().default(sql`(datetime('now'))`),
  dueDate: text('due_date'),
  returnedAt: text('returned_at'),
  note: text('note'),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Location = typeof locations.$inferSelect
export type NewLocation = typeof locations.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type Checkout = typeof checkouts.$inferSelect
export type NewCheckout = typeof checkouts.$inferInsert
