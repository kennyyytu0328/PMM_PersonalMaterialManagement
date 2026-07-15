import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'

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

export const people = sqliteTable('people', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  department: text('department'),
  email: text('email'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetNo: text('asset_no').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id),
  locationId: integer('location_id').references(() => locations.id),
  custodianId: integer('custodian_id').references(() => people.id),
  status: text('status', {
    enum: ['idle', 'in_use', 'repair', 'lent_out', 'lost', 'scrapped'],
  })
    .notNull()
    .default('idle'),
  acquiredAt: text('acquired_at'),
  cost: real('cost'),
  vendor: text('vendor'),
  barcode: text('barcode'),
  serialNo: text('serial_no'),
  imageUrl: text('image_url'),
  scrappedAt: text('scrapped_at'),
  scrapReason: text('scrap_reason'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const assetEvents = sqliteTable('asset_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id),
  type: text('type', {
    enum: [
      'REGISTER',
      'TRANSFER',
      'STATUS_CHANGE',
      'SCRAP_REQUESTED',
      'SCRAP_APPROVED',
      'SCRAP_REJECTED',
    ],
  }).notNull(),
  fromCustodianId: integer('from_custodian_id').references(() => people.id),
  toCustodianId: integer('to_custodian_id').references(() => people.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  note: text('note'),
  performedBy: integer('performed_by')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const scrapRequests = sqliteTable('scrap_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id),
  reason: text('reason').notNull(),
  requestedBy: integer('requested_by')
    .notNull()
    .references(() => users.id),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] })
    .notNull()
    .default('pending'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewNote: text('review_note'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  reviewedAt: text('reviewed_at'),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  checkouts: many(checkouts),
}))

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  items: many(items),
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'parentCategory' }),
  children: many(categories, { relationName: 'parentCategory' }),
}))

export const locationsRelations = relations(locations, ({ many }) => ({
  items: many(items),
}))

export const itemsRelations = relations(items, ({ one, many }) => ({
  category: one(categories, { fields: [items.categoryId], references: [categories.id] }),
  location: one(locations, { fields: [items.locationId], references: [locations.id] }),
  transactions: many(transactions),
  checkouts: many(checkouts),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  item: one(items, { fields: [transactions.itemId], references: [items.id] }),
  performer: one(users, { fields: [transactions.performedBy], references: [users.id] }),
}))

export const checkoutsRelations = relations(checkouts, ({ one }) => ({
  item: one(items, { fields: [checkouts.itemId], references: [items.id] }),
  user: one(users, { fields: [checkouts.userId], references: [users.id] }),
}))

export const peopleRelations = relations(people, ({ many }) => ({
  assets: many(assets),
}))

export const assetsRelations = relations(assets, ({ one, many }) => ({
  category: one(categories, { fields: [assets.categoryId], references: [categories.id] }),
  location: one(locations, { fields: [assets.locationId], references: [locations.id] }),
  custodian: one(people, { fields: [assets.custodianId], references: [people.id] }),
  events: many(assetEvents),
  scrapRequests: many(scrapRequests),
}))

export const assetEventsRelations = relations(assetEvents, ({ one }) => ({
  asset: one(assets, { fields: [assetEvents.assetId], references: [assets.id] }),
  fromCustodian: one(people, {
    fields: [assetEvents.fromCustodianId],
    references: [people.id],
    relationName: 'fromCustodian',
  }),
  toCustodian: one(people, {
    fields: [assetEvents.toCustodianId],
    references: [people.id],
    relationName: 'toCustodian',
  }),
  performer: one(users, { fields: [assetEvents.performedBy], references: [users.id] }),
}))

export const scrapRequestsRelations = relations(scrapRequests, ({ one }) => ({
  asset: one(assets, { fields: [scrapRequests.assetId], references: [assets.id] }),
  requester: one(users, {
    fields: [scrapRequests.requestedBy],
    references: [users.id],
    relationName: 'scrapRequester',
  }),
  reviewer: one(users, {
    fields: [scrapRequests.reviewedBy],
    references: [users.id],
    relationName: 'scrapReviewer',
  }),
}))

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
export type Person = typeof people.$inferSelect
export type NewPerson = typeof people.$inferInsert
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type AssetEvent = typeof assetEvents.$inferSelect
export type NewAssetEvent = typeof assetEvents.$inferInsert
export type ScrapRequest = typeof scrapRequests.$inferSelect
export type NewScrapRequest = typeof scrapRequests.$inferInsert
