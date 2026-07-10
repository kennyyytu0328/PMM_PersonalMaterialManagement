# Asset Management Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-unit asset management (財產入帳 / 換人使用 / 報廢除帳) to PMM alongside the existing quantity-based inventory.

**Architecture:** Four new tables (`people`, `assets`, `asset_events`, `scrap_requests`) in the existing SQLite/Drizzle schema; new REST routes under `/api/people`, `/api/assets`, `/api/scrap-requests` following the existing handler pattern; new pages `/assets`, `/assets/new`, `/assets/[id]`, `/assets/[id]/edit` plus two new admin tabs. Pure business rules (asset-number generation, action guards) live in `src/lib/` so they are unit-testable; route handlers stay thin.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Drizzle ORM + better-sqlite3, NextAuth v5, Zod, Tailwind CSS 4, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-asset-management-design.md`

## Global Constraints

- API responses always `{ success: boolean, data?, error?, meta? }`; errors use `parsed.error.issues[0].message` for Zod failures.
- Every API handler: `const session = await auth()` → 401 if no user; mutations additionally check `(session.user as any).role` → 403.
- Immutability everywhere — never mutate objects; spread to create new ones.
- All user input validated with Zod (schemas in `src/lib/validations.ts`).
- Client components call APIs via `apiFetch` from `@/lib/api` (never bare `fetch('/api/...')`) — required for sub-path deployment.
- Every new UI string goes into BOTH `messages/en.json` and `messages/zh-TW.json` (Task 5 adds them all up front; later tasks only consume them).
- No `console.log` in committed code (`console.error` is acceptable in catch blocks, matching existing code).
- Files < 400 lines target, 800 max.
- Commit after every task with `<type>: <description>` format.
- Run commands with pnpm from repo root: `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:generate`, `pnpm db:migrate`.
- A PostToolUse hook auto-formats written files with Prettier — do not fight its formatting.
- Note on API tests: this repo has no HTTP-handler test harness (see `__tests__/api/auth.test.ts` — it unit-tests logic only). All asset business rules are therefore extracted to `src/lib/asset-no.ts` and `src/lib/asset-guards.ts` and TDD'd there (Tasks 3–4); route handlers follow the existing untested thin-handler pattern and are verified via `pnpm build` + final manual verification.

---

### Task 1: Database schema — people, assets, assetEvents, scrapRequests

**Files:**
- Modify: `src/db/schema.ts` (append new tables after `checkouts`, new relations after existing relations, new types at bottom)

**Interfaces:**
- Produces: Drizzle tables `people`, `assets`, `assetEvents`, `scrapRequests`; relations enabling `db.query.assets.findMany({ with: { category, location, custodian, events } })`; types `Person`, `NewPerson`, `Asset`, `NewAsset`, `AssetEvent`, `NewAssetEvent`, `ScrapRequest`, `NewScrapRequest`.

- [ ] **Step 1: Add tables to `src/db/schema.ts`**

Append after the `checkouts` table definition:

```typescript
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
```

- [ ] **Step 2: Add relations**

Append after `checkoutsRelations`:

```typescript
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
```

- [ ] **Step 3: Add inferred types at the bottom of the file**

```typescript
export type Person = typeof people.$inferSelect
export type NewPerson = typeof people.$inferInsert
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type AssetEvent = typeof assetEvents.$inferSelect
export type NewAssetEvent = typeof assetEvents.$inferInsert
export type ScrapRequest = typeof scrapRequests.$inferSelect
export type NewScrapRequest = typeof scrapRequests.$inferInsert
```

- [ ] **Step 4: Generate and apply the migration**

Run: `pnpm db:generate`
Expected: a new file appears in `src/db/migrations/` creating tables `people`, `assets`, `asset_events`, `scrap_requests`.

Run: `pnpm db:migrate`
Expected: exits 0, no error output.

- [ ] **Step 5: Verify existing tests still pass**

Run: `pnpm test`
Expected: 24 tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/migrations
git commit -m "feat: add people, assets, assetEvents, scrapRequests tables"
```

---

### Task 2: Zod validation schemas

**Files:**
- Modify: `src/lib/validations.ts` (append at bottom)
- Test: `__tests__/lib/asset-validations.test.ts` (create)

**Interfaces:**
- Produces (all exported from `@/lib/validations`): `createPersonSchema`, `updatePersonSchema`, `createAssetSchema`, `updateAssetSchema`, `transferAssetSchema`, `changeAssetStatusSchema`, `createScrapRequestSchema`, `reviewScrapRequestSchema`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/asset-validations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  createPersonSchema,
  updatePersonSchema,
  createAssetSchema,
  transferAssetSchema,
  changeAssetStatusSchema,
  createScrapRequestSchema,
  reviewScrapRequestSchema,
} from '@/lib/validations'

describe('createPersonSchema', () => {
  it('validates a person with name only', () => {
    expect(createPersonSchema.safeParse({ name: '王小明' }).success).toBe(true)
  })

  it('accepts optional department and email', () => {
    const result = createPersonSchema.safeParse({
      name: '王小明',
      department: 'IT',
      email: 'ming@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(createPersonSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(
      createPersonSchema.safeParse({ name: '王小明', email: 'not-an-email' }).success
    ).toBe(false)
  })
})

describe('updatePersonSchema', () => {
  it('accepts isActive toggle alone', () => {
    expect(updatePersonSchema.safeParse({ isActive: false }).success).toBe(true)
  })
})

describe('createAssetSchema', () => {
  it('validates minimal asset (name only, assetNo auto-generated)', () => {
    expect(createAssetSchema.safeParse({ name: 'Dell Laptop' }).success).toBe(true)
  })

  it('accepts full asset', () => {
    const result = createAssetSchema.safeParse({
      assetNo: 'AST-2026-0001',
      name: 'Dell Laptop',
      description: 'Latitude 5440',
      categoryId: 1,
      locationId: 2,
      custodianId: 3,
      acquiredAt: '2026-07-01',
      cost: 32000,
      vendor: 'Dell Taiwan',
      barcode: '4711234567890',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(createAssetSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects negative cost', () => {
    expect(createAssetSchema.safeParse({ name: 'X', cost: -1 }).success).toBe(false)
  })
})

describe('transferAssetSchema', () => {
  it('requires custodianId', () => {
    expect(transferAssetSchema.safeParse({}).success).toBe(false)
    expect(transferAssetSchema.safeParse({ custodianId: 2 }).success).toBe(true)
  })
})

describe('changeAssetStatusSchema', () => {
  it('accepts non-scrap statuses', () => {
    for (const status of ['idle', 'in_use', 'repair', 'lent_out', 'lost']) {
      expect(changeAssetStatusSchema.safeParse({ status }).success).toBe(true)
    }
  })

  it('rejects scrapped (must go through scrap request)', () => {
    expect(changeAssetStatusSchema.safeParse({ status: 'scrapped' }).success).toBe(false)
  })
})

describe('createScrapRequestSchema', () => {
  it('requires assetId and reason', () => {
    expect(createScrapRequestSchema.safeParse({ assetId: 1, reason: '老舊損壞' }).success).toBe(true)
    expect(createScrapRequestSchema.safeParse({ assetId: 1, reason: '' }).success).toBe(false)
    expect(createScrapRequestSchema.safeParse({ reason: 'x' }).success).toBe(false)
  })
})

describe('reviewScrapRequestSchema', () => {
  it('accepts approve and reject', () => {
    expect(reviewScrapRequestSchema.safeParse({ action: 'approve' }).success).toBe(true)
    expect(
      reviewScrapRequestSchema.safeParse({ action: 'reject', reviewNote: 'still usable' }).success
    ).toBe(true)
  })

  it('rejects unknown action', () => {
    expect(reviewScrapRequestSchema.safeParse({ action: 'maybe' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run __tests__/lib/asset-validations.test.ts`
Expected: FAIL — the schemas are not exported from `@/lib/validations`.

- [ ] **Step 3: Implement the schemas**

Append to `src/lib/validations.ts`:

```typescript
export const createPersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  department: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
})

export const updatePersonSchema = createPersonSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export const createAssetSchema = z.object({
  assetNo: z.string().min(1).max(50).optional(),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  categoryId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  custodianId: z.number().int().positive().optional(),
  acquiredAt: z.string().max(30).optional(),
  cost: z.number().min(0).optional(),
  vendor: z.string().max(200).optional(),
  barcode: z.string().max(100).optional(),
})

export const updateAssetSchema = createAssetSchema.partial()

export const transferAssetSchema = z.object({
  custodianId: z.number().int().positive(),
  note: z.string().max(500).optional(),
})

export const changeAssetStatusSchema = z.object({
  status: z.enum(['idle', 'in_use', 'repair', 'lent_out', 'lost']),
  note: z.string().max(500).optional(),
})

export const createScrapRequestSchema = z.object({
  assetId: z.number().int().positive(),
  reason: z.string().min(1, 'Reason is required').max(500),
})

export const reviewScrapRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().max(500).optional(),
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run __tests__/lib/asset-validations.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts __tests__/lib/asset-validations.test.ts
git commit -m "feat: zod schemas for people, assets, transfers, scrap requests"
```

---

### Task 3: Asset number generator

**Files:**
- Create: `src/lib/asset-no.ts`
- Test: `__tests__/lib/asset-no.test.ts`

**Interfaces:**
- Produces: `generateAssetNo(year: number, seq: number): string` → `"AST-2026-0001"`; `nextAssetSeq(existingAssetNos: string[], year: number): number` → next free sequence for that year (1 when none).

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/asset-no.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateAssetNo, nextAssetSeq } from '@/lib/asset-no'

describe('generateAssetNo', () => {
  it('formats with 4-digit zero padding', () => {
    expect(generateAssetNo(2026, 1)).toBe('AST-2026-0001')
    expect(generateAssetNo(2026, 42)).toBe('AST-2026-0042')
  })

  it('does not truncate sequences beyond 9999', () => {
    expect(generateAssetNo(2026, 12345)).toBe('AST-2026-12345')
  })
})

describe('nextAssetSeq', () => {
  it('returns 1 for empty list', () => {
    expect(nextAssetSeq([], 2026)).toBe(1)
  })

  it('increments the max sequence of the given year', () => {
    expect(nextAssetSeq(['AST-2026-0001', 'AST-2026-0007'], 2026)).toBe(8)
  })

  it('ignores other years (year rollover restarts at 1)', () => {
    expect(nextAssetSeq(['AST-2025-0009'], 2026)).toBe(1)
  })

  it('ignores manual asset numbers that do not match the pattern', () => {
    expect(nextAssetSeq(['CUSTOM-001', 'AST-2026-0003', 'AST-2026-XXXX'], 2026)).toBe(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run __tests__/lib/asset-no.test.ts`
Expected: FAIL — module `@/lib/asset-no` not found.

- [ ] **Step 3: Implement**

Create `src/lib/asset-no.ts`:

```typescript
export function generateAssetNo(year: number, seq: number): string {
  return `AST-${year}-${String(seq).padStart(4, '0')}`
}

export function nextAssetSeq(existingAssetNos: string[], year: number): number {
  const pattern = new RegExp(`^AST-${year}-(\\d+)$`)
  const seqs = existingAssetNos
    .map((no) => pattern.exec(no))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => parseInt(m[1], 10))
  return seqs.length === 0 ? 1 : Math.max(...seqs) + 1
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run __tests__/lib/asset-no.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset-no.ts __tests__/lib/asset-no.test.ts
git commit -m "feat: asset number generation (AST-YYYY-NNNN with manual override support)"
```

---

### Task 4: Asset action guards

**Files:**
- Create: `src/lib/asset-guards.ts`
- Test: `__tests__/lib/asset-guards.test.ts`

**Interfaces:**
- Produces: `ASSET_STATUSES` (readonly tuple of the six statuses), `type AssetStatus`, and `assetActionBlockReason(status: string, hasPendingScrap: boolean): 'scrapped' | 'pendingScrap' | null`. Route handlers (Tasks 8–10) call `assetActionBlockReason` before any mutation of an asset and return 400 with `'Asset is scrapped'` / `'Asset has a pending scrap request'` when non-null.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/asset-guards.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ASSET_STATUSES, assetActionBlockReason } from '@/lib/asset-guards'

describe('ASSET_STATUSES', () => {
  it('contains the six lifecycle statuses in order', () => {
    expect(ASSET_STATUSES).toEqual(['idle', 'in_use', 'repair', 'lent_out', 'lost', 'scrapped'])
  })
})

describe('assetActionBlockReason', () => {
  it('blocks scrapped assets', () => {
    expect(assetActionBlockReason('scrapped', false)).toBe('scrapped')
  })

  it('scrapped wins over pending scrap', () => {
    expect(assetActionBlockReason('scrapped', true)).toBe('scrapped')
  })

  it('blocks assets with a pending scrap request', () => {
    expect(assetActionBlockReason('in_use', true)).toBe('pendingScrap')
  })

  it('allows normal statuses without pending request', () => {
    for (const status of ['idle', 'in_use', 'repair', 'lent_out', 'lost']) {
      expect(assetActionBlockReason(status, false)).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run __tests__/lib/asset-guards.test.ts`
Expected: FAIL — module `@/lib/asset-guards` not found.

- [ ] **Step 3: Implement**

Create `src/lib/asset-guards.ts`:

```typescript
export const ASSET_STATUSES = [
  'idle',
  'in_use',
  'repair',
  'lent_out',
  'lost',
  'scrapped',
] as const

export type AssetStatus = (typeof ASSET_STATUSES)[number]

export function assetActionBlockReason(
  status: string,
  hasPendingScrap: boolean
): 'scrapped' | 'pendingScrap' | null {
  if (status === 'scrapped') return 'scrapped'
  if (hasPendingScrap) return 'pendingScrap'
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run __tests__/lib/asset-guards.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asset-guards.ts __tests__/lib/asset-guards.test.ts
git commit -m "feat: asset action guards (scrapped / pending-scrap blocking)"
```

---

### Task 5: i18n messages (en + zh-TW)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh-TW.json`

**Interfaces:**
- Produces: namespaces `assets`, `assetForm`, `assetDetail`, `people`, `scrapRequests`; new keys `nav.assets`, `admin.tabs.people`, `admin.tabs.scrapApprovals`, `dashboard.stats.totalAssets`, `dashboard.stats.assetsInUse`, `dashboard.stats.pendingScrap`. All later UI tasks use `useTranslations('<namespace>')` with exactly these keys.

- [ ] **Step 1: Add English strings to `messages/en.json`**

Add `"assets": "Assets"` inside the existing `nav` object. Add `"people": "People", "scrapApprovals": "Approvals"` inside the existing `admin.tabs` object. Add `"totalAssets": "Total Assets", "assetsInUse": "Assets In Use", "pendingScrap": "Pending Scrap"` inside the existing `dashboard.stats` object. Then add these top-level namespaces (keep alphabetical placement consistent with the file — append after `scan` is fine):

```json
"assets": {
  "title": "Assets",
  "add": "Register",
  "searchPlaceholder": "Search name, asset no, barcode...",
  "allStatuses": "All statuses",
  "allCustodians": "All custodians",
  "allCategories": "All categories",
  "noAssets": "No assets yet",
  "noAssetsDesc": "Register your first asset to get started",
  "loadFailed": "Failed to load assets",
  "custodian": "Custodian",
  "status": {
    "idle": "In Storage",
    "in_use": "In Use",
    "repair": "Under Repair",
    "lent_out": "Lent Out",
    "lost": "Lost",
    "scrapped": "Scrapped"
  }
},
"assetForm": {
  "createTitle": "Register Asset",
  "editTitle": "Edit Asset",
  "nameLabel": "Name",
  "namePlaceholder": "e.g. Dell Latitude 5440",
  "assetNoLabel": "Asset No.",
  "assetNoPlaceholder": "Leave blank to auto-generate",
  "descriptionLabel": "Description",
  "descriptionPlaceholder": "Optional details",
  "categoryLabel": "Category",
  "categoryPlaceholder": "Select category",
  "locationLabel": "Location",
  "locationPlaceholder": "Select location",
  "custodianLabel": "Custodian",
  "custodianPlaceholder": "No custodian (in storage)",
  "acquiredAtLabel": "Acquisition Date",
  "costLabel": "Cost",
  "costPlaceholder": "0.00",
  "vendorLabel": "Vendor",
  "vendorPlaceholder": "Optional",
  "barcodeLabel": "Barcode",
  "barcodePlaceholder": "Scan or type barcode",
  "nameRequired": "Name is required",
  "createdSuccess": "Asset registered",
  "updatedSuccess": "Asset updated",
  "saveFailed": "Failed to save asset",
  "createAsset": "Register Asset",
  "updateAsset": "Save Changes"
},
"assetDetail": {
  "loadFailed": "Failed to load asset",
  "notFound": "Asset not found",
  "assetNo": "Asset No.",
  "category": "Category",
  "location": "Location",
  "custodian": "Custodian",
  "noCustodian": "None (in storage)",
  "acquiredAt": "Acquired",
  "cost": "Cost",
  "vendor": "Vendor",
  "barcode": "Barcode",
  "scrappedAt": "Scrapped At",
  "scrapReason": "Scrap Reason",
  "history": "History",
  "noEvents": "No history yet",
  "edit": "Edit",
  "transfer": "Transfer",
  "changeStatus": "Change Status",
  "requestScrap": "Request Scrap",
  "pendingScrapNotice": "A scrap request is pending review for this asset.",
  "events": {
    "REGISTER": "Registered",
    "TRANSFER": "Transferred",
    "STATUS_CHANGE": "Status changed",
    "SCRAP_REQUESTED": "Scrap requested",
    "SCRAP_APPROVED": "Scrap approved",
    "SCRAP_REJECTED": "Scrap rejected"
  },
  "transferModal": {
    "title": "Transfer Custody",
    "custodianLabel": "New custodian",
    "custodianPlaceholder": "Select person",
    "noteLabel": "Note (optional)",
    "custodianRequired": "Please select a custodian",
    "success": "Custody transferred",
    "failed": "Transfer failed",
    "submit": "Transfer"
  },
  "statusModal": {
    "title": "Change Status",
    "statusLabel": "New status",
    "noteLabel": "Note (optional)",
    "success": "Status updated",
    "failed": "Failed to update status",
    "submit": "Update"
  },
  "scrapModal": {
    "title": "Request Scrap",
    "reasonLabel": "Reason",
    "reasonPlaceholder": "Why should this asset be written off?",
    "reasonRequired": "Reason is required",
    "success": "Scrap request submitted",
    "failed": "Failed to submit scrap request",
    "submit": "Submit Request"
  }
},
"people": {
  "title": "People",
  "add": "Add",
  "noPeople": "No people yet",
  "noPeopleDesc": "Add people who can hold assets",
  "loadFailed": "Failed to load people",
  "nameLabel": "Name",
  "namePlaceholder": "Full name",
  "departmentLabel": "Department",
  "departmentPlaceholder": "Optional",
  "emailLabel": "Email",
  "emailPlaceholder": "Optional",
  "activeLabel": "Active",
  "inactive": "Inactive",
  "nameRequired": "Name is required",
  "created": "Person added",
  "updated": "Person updated",
  "deleted": "Person deleted",
  "createFailed": "Failed to add person",
  "updateFailed": "Failed to update person",
  "deleteFailed": "Failed to delete person",
  "confirmDelete": "Delete {name}?",
  "modalAdd": "Add Person",
  "modalEdit": "Edit Person",
  "save": "Save",
  "create": "Create",
  "saving": "Saving...",
  "creating": "Creating..."
},
"scrapRequests": {
  "title": "Scrap Approvals",
  "noRequests": "No pending requests",
  "noRequestsDesc": "Scrap requests awaiting review will appear here",
  "loadFailed": "Failed to load scrap requests",
  "requestedBy": "Requested by {name}",
  "reason": "Reason",
  "approve": "Approve",
  "reject": "Reject",
  "approveTitle": "Approve Scrap",
  "rejectTitle": "Reject Scrap",
  "reviewNoteLabel": "Review note (optional)",
  "approved": "Asset scrapped",
  "rejected": "Request rejected",
  "reviewFailed": "Review failed",
  "confirmSubmit": "Confirm"
}
```

- [ ] **Step 2: Add Traditional Chinese strings to `messages/zh-TW.json`**

Same key structure; add `"assets": "財產"` to `nav`, `"people": "保管人", "scrapApprovals": "報廢審核"` to `admin.tabs`, `"totalAssets": "財產總數", "assetsInUse": "使用中財產", "pendingScrap": "待審報廢"` to `dashboard.stats`, then:

```json
"assets": {
  "title": "財產管理",
  "add": "財產入帳",
  "searchPlaceholder": "搜尋名稱、財產編號、條碼...",
  "allStatuses": "全部狀態",
  "allCustodians": "全部保管人",
  "allCategories": "全部分類",
  "noAssets": "尚無財產",
  "noAssetsDesc": "登記第一筆財產開始使用",
  "loadFailed": "載入財產失敗",
  "custodian": "保管人",
  "status": {
    "idle": "在庫",
    "in_use": "使用中",
    "repair": "維修中",
    "lent_out": "外借",
    "lost": "遺失",
    "scrapped": "已報廢"
  }
},
"assetForm": {
  "createTitle": "財產入帳",
  "editTitle": "編輯財產",
  "nameLabel": "名稱",
  "namePlaceholder": "例如：Dell Latitude 5440",
  "assetNoLabel": "財產編號",
  "assetNoPlaceholder": "留空自動產生",
  "descriptionLabel": "描述",
  "descriptionPlaceholder": "選填",
  "categoryLabel": "分類",
  "categoryPlaceholder": "選擇分類",
  "locationLabel": "位置",
  "locationPlaceholder": "選擇位置",
  "custodianLabel": "保管人",
  "custodianPlaceholder": "無保管人（在庫）",
  "acquiredAtLabel": "取得日期",
  "costLabel": "取得成本",
  "costPlaceholder": "0.00",
  "vendorLabel": "廠商",
  "vendorPlaceholder": "選填",
  "barcodeLabel": "條碼",
  "barcodePlaceholder": "掃描或輸入條碼",
  "nameRequired": "請輸入名稱",
  "createdSuccess": "財產已入帳",
  "updatedSuccess": "財產已更新",
  "saveFailed": "儲存失敗",
  "createAsset": "入帳",
  "updateAsset": "儲存變更"
},
"assetDetail": {
  "loadFailed": "載入財產失敗",
  "notFound": "找不到此財產",
  "assetNo": "財產編號",
  "category": "分類",
  "location": "位置",
  "custodian": "保管人",
  "noCustodian": "無（在庫）",
  "acquiredAt": "取得日期",
  "cost": "取得成本",
  "vendor": "廠商",
  "barcode": "條碼",
  "scrappedAt": "報廢日期",
  "scrapReason": "報廢原因",
  "history": "歷史紀錄",
  "noEvents": "尚無紀錄",
  "edit": "編輯",
  "transfer": "換人使用",
  "changeStatus": "變更狀態",
  "requestScrap": "申請報廢",
  "pendingScrapNotice": "此財產有待審核的報廢申請。",
  "events": {
    "REGISTER": "入帳",
    "TRANSFER": "換人使用",
    "STATUS_CHANGE": "狀態變更",
    "SCRAP_REQUESTED": "申請報廢",
    "SCRAP_APPROVED": "核准報廢",
    "SCRAP_REJECTED": "駁回報廢"
  },
  "transferModal": {
    "title": "換人使用",
    "custodianLabel": "新保管人",
    "custodianPlaceholder": "選擇保管人",
    "noteLabel": "備註（選填）",
    "custodianRequired": "請選擇保管人",
    "success": "已完成移轉",
    "failed": "移轉失敗",
    "submit": "移轉"
  },
  "statusModal": {
    "title": "變更狀態",
    "statusLabel": "新狀態",
    "noteLabel": "備註（選填）",
    "success": "狀態已更新",
    "failed": "狀態更新失敗",
    "submit": "更新"
  },
  "scrapModal": {
    "title": "申請報廢",
    "reasonLabel": "報廢原因",
    "reasonPlaceholder": "說明此財產為何應報廢除帳",
    "reasonRequired": "請輸入報廢原因",
    "success": "報廢申請已送出",
    "failed": "報廢申請送出失敗",
    "submit": "送出申請"
  }
},
"people": {
  "title": "保管人管理",
  "add": "新增",
  "noPeople": "尚無保管人",
  "noPeopleDesc": "新增可保管財產的人員",
  "loadFailed": "載入保管人失敗",
  "nameLabel": "姓名",
  "namePlaceholder": "完整姓名",
  "departmentLabel": "部門",
  "departmentPlaceholder": "選填",
  "emailLabel": "電子郵件",
  "emailPlaceholder": "選填",
  "activeLabel": "啟用",
  "inactive": "停用",
  "nameRequired": "請輸入姓名",
  "created": "已新增保管人",
  "updated": "已更新保管人",
  "deleted": "已刪除保管人",
  "createFailed": "新增失敗",
  "updateFailed": "更新失敗",
  "deleteFailed": "刪除失敗",
  "confirmDelete": "確定刪除 {name}？",
  "modalAdd": "新增保管人",
  "modalEdit": "編輯保管人",
  "save": "儲存",
  "create": "建立",
  "saving": "儲存中...",
  "creating": "建立中..."
},
"scrapRequests": {
  "title": "報廢審核",
  "noRequests": "沒有待審核的申請",
  "noRequestsDesc": "待審核的報廢申請將顯示於此",
  "loadFailed": "載入報廢申請失敗",
  "requestedBy": "申請人：{name}",
  "reason": "原因",
  "approve": "核准",
  "reject": "駁回",
  "approveTitle": "核准報廢",
  "rejectTitle": "駁回報廢",
  "reviewNoteLabel": "審核備註（選填）",
  "approved": "財產已報廢除帳",
  "rejected": "申請已駁回",
  "reviewFailed": "審核失敗",
  "confirmSubmit": "確認"
}
```

- [ ] **Step 3: Verify JSON validity and tests**

Run: `pnpm test`
Expected: all tests pass (broken JSON would fail the build/test setup).

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/zh-TW.json','utf8')); console.error('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/zh-TW.json
git commit -m "feat: i18n strings for asset management (en, zh-TW)"
```

---

### Task 6: People API

**Files:**
- Create: `src/app/api/people/route.ts`
- Create: `src/app/api/people/[id]/route.ts`

**Interfaces:**
- Consumes: `createPersonSchema`, `updatePersonSchema` (Task 2); `people`, `assets`, `assetEvents` tables (Task 1).
- Produces: `GET /api/people?activeOnly=true` → `{ success, data: Person[] }` ordered by name; `POST /api/people` (admin) → 201; `PUT /api/people/[id]` (admin); `DELETE /api/people/[id]` (admin) → 400 `'Person has asset history. Deactivate instead.'` when referenced by any asset or asset event.

- [ ] **Step 1: Create `src/app/api/people/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { people } from '@/db/schema'
import { createPersonSchema } from '@/lib/validations'
import { asc, eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const allPeople = await db.query.people.findMany({
      where: activeOnly ? eq(people.isActive, true) : undefined,
      orderBy: asc(people.name),
    })

    return NextResponse.json({ success: true, data: allPeople })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch people' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createPersonSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [person] = await db.insert(people).values(parsed.data).returning()

    return NextResponse.json({ success: true, data: person }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create person' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/people/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { people, assets, assetEvents } from '@/db/schema'
import { updatePersonSchema } from '@/lib/validations'
import { eq, or } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const person = await db.query.people.findFirst({ where: eq(people.id, parseInt(id)) })

    if (!person) {
      return NextResponse.json({ success: false, error: 'Person not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: person })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch person' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const personId = parseInt(id)

    const existing = await db.query.people.findFirst({ where: eq(people.id, personId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Person not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updatePersonSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(people)
      .set(parsed.data)
      .where(eq(people.id, personId))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update person' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const personId = parseInt(id)

    const existing = await db.query.people.findFirst({ where: eq(people.id, personId) })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Person not found' }, { status: 404 })
    }

    const [heldAsset, eventRef] = await Promise.all([
      db.query.assets.findFirst({ where: eq(assets.custodianId, personId) }),
      db.query.assetEvents.findFirst({
        where: or(
          eq(assetEvents.fromCustodianId, personId),
          eq(assetEvents.toCustodianId, personId)
        ),
      }),
    ])

    if (heldAsset || eventRef) {
      return NextResponse.json(
        { success: false, error: 'Person has asset history. Deactivate instead.' },
        { status: 400 }
      )
    }

    await db.delete(people).where(eq(people.id, personId))

    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete person' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/people
git commit -m "feat: people API (custodian registry with delete guard)"
```

---

### Task 7: Assets collection API (list + register 財產入帳)

**Files:**
- Create: `src/app/api/assets/route.ts`

**Interfaces:**
- Consumes: `createAssetSchema` (Task 2), `generateAssetNo`/`nextAssetSeq` (Task 3), tables (Task 1).
- Produces: `GET /api/assets?search=&status=&custodianId=&categoryId=&locationId=&page=&limit=` → `{ success, data: AssetWithRelations[], meta: { total, page, limit, totalPages } }` where each asset includes `category`, `location`, `custodian`. `POST /api/assets` (staff/admin) registers an asset, auto-assigns `assetNo` when omitted, sets status `in_use` when `custodianId` given (else `idle`), logs a `REGISTER` event, returns 201 with relations. Duplicate assetNo → 400 `'Asset number already exists'`.

- [ ] **Step 1: Create `src/app/api/assets/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents } from '@/db/schema'
import { createAssetSchema } from '@/lib/validations'
import { generateAssetNo, nextAssetSeq } from '@/lib/asset-no'
import { eq, and, like, or, desc, count, SQL } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status')
    const custodianId = searchParams.get('custodianId')
    const categoryId = searchParams.get('categoryId')
    const locationId = searchParams.get('locationId')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []

    if (search) {
      conditions.push(
        or(
          like(assets.name, `%${search}%`),
          like(assets.assetNo, `%${search}%`),
          like(assets.barcode, `%${search}%`)
        ) as SQL
      )
    }

    if (status) conditions.push(eq(assets.status, status as (typeof assets.status.enumValues)[number]))
    if (custodianId) conditions.push(eq(assets.custodianId, parseInt(custodianId)))
    if (categoryId) conditions.push(eq(assets.categoryId, parseInt(categoryId)))
    if (locationId) conditions.push(eq(assets.locationId, parseInt(locationId)))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [allAssets, [{ total }]] = await Promise.all([
      db.query.assets.findMany({
        where,
        with: { category: true, location: true, custodian: true },
        limit,
        offset,
        orderBy: desc(assets.createdAt),
      }),
      db.select({ total: count() }).from(assets).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: allAssets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch assets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const existing = await db.select({ assetNo: assets.assetNo }).from(assets)

    let assetNo = parsed.data.assetNo
    if (assetNo) {
      if (existing.some((a) => a.assetNo === assetNo)) {
        return NextResponse.json(
          { success: false, error: 'Asset number already exists' },
          { status: 400 }
        )
      }
    } else {
      const year = new Date().getFullYear()
      assetNo = generateAssetNo(
        year,
        nextAssetSeq(
          existing.map((a) => a.assetNo),
          year
        )
      )
    }

    const status = parsed.data.custodianId ? 'in_use' : 'idle'

    const [newAsset] = await db
      .insert(assets)
      .values({ ...parsed.data, assetNo, status })
      .returning()

    await db.insert(assetEvents).values({
      assetId: newAsset.id,
      type: 'REGISTER',
      toCustodianId: parsed.data.custodianId,
      toStatus: status,
      performedBy: parseInt((session.user as any).id),
    })

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, newAsset.id),
      with: { category: true, location: true, custodian: true },
    })

    return NextResponse.json({ success: true, data: asset }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create asset' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds. If `parseInt((session.user as any).id)` fails typecheck, check how `src/app/api/transactions/route.ts` derives `performedBy` from the session and copy that exact expression.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/assets/route.ts
git commit -m "feat: assets API - list with filters and register (財產入帳)"
```

---

### Task 8: Asset item API (detail + edit)

**Files:**
- Create: `src/app/api/assets/[id]/route.ts`

**Interfaces:**
- Consumes: `updateAssetSchema` (Task 2), `assetActionBlockReason` (Task 4).
- Produces: `GET /api/assets/[id]` → asset with `category`, `location`, `custodian`, `events` (each with `performer`, `fromCustodian`, `toCustodian`, ordered newest first), and `pendingScrapRequest` (the pending row or `null`). `PUT /api/assets/[id]` (staff/admin) edits fields; blocked (400) when scrapped/pending scrap; enforces assetNo uniqueness.

- [ ] **Step 1: Create `src/app/api/assets/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, scrapRequests } from '@/db/schema'
import { updateAssetSchema } from '@/lib/validations'
import { assetActionBlockReason } from '@/lib/asset-guards'
import { eq, and, ne, desc } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

const BLOCK_MESSAGES = {
  scrapped: 'Asset is scrapped',
  pendingScrap: 'Asset has a pending scrap request',
} as const

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const assetId = parseInt(id)

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      with: {
        category: true,
        location: true,
        custodian: true,
        events: {
          with: {
            performer: { columns: { id: true, name: true } },
            fromCustodian: true,
            toCustodian: true,
          },
          orderBy: (events, { desc: descFn }) => [descFn(events.createdAt), descFn(events.id)],
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pendingScrapRequest = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    return NextResponse.json({
      success: true,
      data: { ...asset, pendingScrapRequest: pendingScrapRequest ?? null },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch asset' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const assetId = parseInt(id)

    const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pending = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    const blocked = assetActionBlockReason(asset.status, !!pending)
    if (blocked) {
      return NextResponse.json(
        { success: false, error: BLOCK_MESSAGES[blocked] },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = updateAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    if (parsed.data.assetNo) {
      const conflict = await db.query.assets.findFirst({
        where: and(eq(assets.assetNo, parsed.data.assetNo), ne(assets.id, assetId)),
      })
      if (conflict) {
        return NextResponse.json(
          { success: false, error: 'Asset number already exists' },
          { status: 400 }
        )
      }
    }

    await db
      .update(assets)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(assets.id, assetId))

    const updated = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      with: { category: true, location: true, custodian: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update asset' }, { status: 500 })
  }
}
```

Note: if the nested `orderBy` callback signature fails typecheck, use `orderBy: [desc(assetEvents.createdAt), desc(assetEvents.id)]` with `assetEvents` imported from `@/db/schema` instead.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/assets/[id]/route.ts"
git commit -m "feat: asset detail and edit API with scrap guards"
```

---

### Task 9: Transfer (換人使用) + status change APIs

**Files:**
- Create: `src/app/api/assets/[id]/transfer/route.ts`
- Create: `src/app/api/assets/[id]/status/route.ts`

**Interfaces:**
- Consumes: `transferAssetSchema`, `changeAssetStatusSchema` (Task 2), `assetActionBlockReason` (Task 4).
- Produces: `POST /api/assets/[id]/transfer` `{ custodianId, note? }` → updates custodian, `idle` becomes `in_use`, logs `TRANSFER` event with from/to; 400 if target person missing/inactive or same as current custodian. `POST /api/assets/[id]/status` `{ status, note? }` → updates status, logs `STATUS_CHANGE` event. Both staff/admin, both blocked when scrapped/pending scrap.

- [ ] **Step 1: Create `src/app/api/assets/[id]/transfer/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents, people, scrapRequests } from '@/db/schema'
import { transferAssetSchema } from '@/lib/validations'
import { assetActionBlockReason } from '@/lib/asset-guards'
import { eq, and } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

const BLOCK_MESSAGES = {
  scrapped: 'Asset is scrapped',
  pendingScrap: 'Asset has a pending scrap request',
} as const

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const assetId = parseInt(id)

    const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pending = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    const blocked = assetActionBlockReason(asset.status, !!pending)
    if (blocked) {
      return NextResponse.json(
        { success: false, error: BLOCK_MESSAGES[blocked] },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = transferAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { custodianId, note } = parsed.data

    if (custodianId === asset.custodianId) {
      return NextResponse.json(
        { success: false, error: 'Asset is already held by this person' },
        { status: 400 }
      )
    }

    const person = await db.query.people.findFirst({ where: eq(people.id, custodianId) })
    if (!person || !person.isActive) {
      return NextResponse.json(
        { success: false, error: 'Custodian not found or inactive' },
        { status: 400 }
      )
    }

    const newStatus = asset.status === 'idle' ? 'in_use' : asset.status

    await db
      .update(assets)
      .set({ custodianId, status: newStatus, updatedAt: new Date().toISOString() })
      .where(eq(assets.id, assetId))

    await db.insert(assetEvents).values({
      assetId,
      type: 'TRANSFER',
      fromCustodianId: asset.custodianId,
      toCustodianId: custodianId,
      fromStatus: asset.status,
      toStatus: newStatus,
      note,
      performedBy: parseInt((session.user as any).id),
    })

    const updated = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      with: { category: true, location: true, custodian: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to transfer asset' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/assets/[id]/status/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents, scrapRequests } from '@/db/schema'
import { changeAssetStatusSchema } from '@/lib/validations'
import { assetActionBlockReason } from '@/lib/asset-guards'
import { eq, and } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

const BLOCK_MESSAGES = {
  scrapped: 'Asset is scrapped',
  pendingScrap: 'Asset has a pending scrap request',
} as const

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const assetId = parseInt(id)

    const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pending = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    const blocked = assetActionBlockReason(asset.status, !!pending)
    if (blocked) {
      return NextResponse.json(
        { success: false, error: BLOCK_MESSAGES[blocked] },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = changeAssetStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status, note } = parsed.data

    if (status === asset.status) {
      return NextResponse.json(
        { success: false, error: 'Asset already has this status' },
        { status: 400 }
      )
    }

    await db
      .update(assets)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(assets.id, assetId))

    await db.insert(assetEvents).values({
      assetId,
      type: 'STATUS_CHANGE',
      fromStatus: asset.status,
      toStatus: status,
      note,
      performedBy: parseInt((session.user as any).id),
    })

    const updated = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      with: { category: true, location: true, custodian: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to change asset status' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/assets/[id]/transfer" "src/app/api/assets/[id]/status"
git commit -m "feat: asset transfer (換人使用) and status change APIs"
```

---

### Task 10: Scrap request + review APIs (報廢除帳)

**Files:**
- Create: `src/app/api/scrap-requests/route.ts`
- Create: `src/app/api/scrap-requests/[id]/review/route.ts`

**Interfaces:**
- Consumes: `createScrapRequestSchema`, `reviewScrapRequestSchema` (Task 2), `assetActionBlockReason` (Task 4).
- Produces: `GET /api/scrap-requests?status=pending&page=&limit=` → `{ success, data: (ScrapRequest & { asset, requester, reviewer })[], meta }` newest first. `POST /api/scrap-requests` (staff/admin) `{ assetId, reason }` → 201, logs `SCRAP_REQUESTED`. `POST /api/scrap-requests/[id]/review` (admin) `{ action: 'approve'|'reject', reviewNote? }` → approve sets asset to scrapped (custodian cleared, `scrappedAt`/`scrapReason` set) and logs `SCRAP_APPROVED`; reject logs `SCRAP_REJECTED`; already-reviewed → 400 `'Request already reviewed'`.

- [ ] **Step 1: Create `src/app/api/scrap-requests/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents, scrapRequests } from '@/db/schema'
import { createScrapRequestSchema } from '@/lib/validations'
import { assetActionBlockReason } from '@/lib/asset-guards'
import { eq, and, desc, count, SQL } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []
    if (status) {
      conditions.push(
        eq(scrapRequests.status, status as (typeof scrapRequests.status.enumValues)[number])
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [requests, [{ total }]] = await Promise.all([
      db.query.scrapRequests.findMany({
        where,
        with: {
          asset: true,
          requester: { columns: { id: true, name: true } },
          reviewer: { columns: { id: true, name: true } },
        },
        limit,
        offset,
        orderBy: desc(scrapRequests.createdAt),
      }),
      db.select({ total: count() }).from(scrapRequests).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: requests,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scrap requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole === 'viewer') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createScrapRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { assetId, reason } = parsed.data

    const asset = await db.query.assets.findFirst({ where: eq(assets.id, assetId) })
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    const pending = await db.query.scrapRequests.findFirst({
      where: and(eq(scrapRequests.assetId, assetId), eq(scrapRequests.status, 'pending')),
    })

    const blocked = assetActionBlockReason(asset.status, !!pending)
    if (blocked === 'scrapped') {
      return NextResponse.json(
        { success: false, error: 'Asset is already scrapped' },
        { status: 400 }
      )
    }
    if (blocked === 'pendingScrap') {
      return NextResponse.json(
        { success: false, error: 'Asset already has a pending scrap request' },
        { status: 400 }
      )
    }

    const performedBy = parseInt((session.user as any).id)

    const [scrapRequest] = await db
      .insert(scrapRequests)
      .values({ assetId, reason, requestedBy: performedBy })
      .returning()

    await db.insert(assetEvents).values({
      assetId,
      type: 'SCRAP_REQUESTED',
      note: reason,
      performedBy,
    })

    return NextResponse.json({ success: true, data: scrapRequest }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create scrap request' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create `src/app/api/scrap-requests/[id]/review/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assets, assetEvents, scrapRequests } from '@/db/schema'
import { reviewScrapRequestSchema } from '@/lib/validations'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const requestId = parseInt(id)

    const scrapRequest = await db.query.scrapRequests.findFirst({
      where: eq(scrapRequests.id, requestId),
    })

    if (!scrapRequest) {
      return NextResponse.json(
        { success: false, error: 'Scrap request not found' },
        { status: 404 }
      )
    }

    if (scrapRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request already reviewed' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = reviewScrapRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { action, reviewNote } = parsed.data
    const now = new Date().toISOString()
    const reviewerId = parseInt((session.user as any).id)

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, scrapRequest.assetId),
    })

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 })
    }

    if (action === 'approve') {
      await db
        .update(assets)
        .set({
          status: 'scrapped',
          custodianId: null,
          scrappedAt: now,
          scrapReason: scrapRequest.reason,
          updatedAt: now,
        })
        .where(eq(assets.id, asset.id))

      await db.insert(assetEvents).values({
        assetId: asset.id,
        type: 'SCRAP_APPROVED',
        fromCustodianId: asset.custodianId,
        fromStatus: asset.status,
        toStatus: 'scrapped',
        note: reviewNote,
        performedBy: reviewerId,
      })
    } else {
      await db.insert(assetEvents).values({
        assetId: asset.id,
        type: 'SCRAP_REJECTED',
        note: reviewNote,
        performedBy: reviewerId,
      })
    }

    const [updated] = await db
      .update(scrapRequests)
      .set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        reviewNote,
        reviewedAt: now,
      })
      .where(eq(scrapRequests.id, requestId))
      .returning()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to review scrap request' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/scrap-requests
git commit -m "feat: scrap request and review APIs (報廢除帳 with approval flow)"
```

---

### Task 11: Scan API extension (asset lookup)

**Files:**
- Modify: `src/app/api/scan/route.ts`

**Interfaces:**
- Produces: response gains `matchType: 'item' | 'asset'`. Items are matched first (existing behavior unchanged); if no item matches, assets are matched by `barcode` or `assetNo`. Asset match returns the asset with `category`, `location`, `custodian`. The scan page (Task 17) checks `json.matchType`.

- [ ] **Step 1: Extend the handler**

In `src/app/api/scan/route.ts`, add `assets` to the schema import (`import { items, assets } from '@/db/schema'`), then replace the block from `if (!item)` (the 404 return) to the final success return with:

```typescript
    if (item) {
      return NextResponse.json({ success: true, matchType: 'item', data: item })
    }

    const code = barcode ?? sku
    if (code) {
      const asset = await db.query.assets.findFirst({
        where: or(eq(assets.barcode, code), eq(assets.assetNo, code)),
        with: { category: true, location: true, custodian: true },
      })
      if (asset) {
        return NextResponse.json({ success: true, matchType: 'asset', data: asset })
      }
    }

    return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
```

(`or` and `eq` are already imported.)

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/scan/route.ts
git commit -m "feat: scan lookup matches assets by barcode or asset number"
```

---

### Task 12: Asset status badge + People admin page + admin tabs

**Files:**
- Create: `src/components/assets/asset-status-badge.tsx`
- Create: `src/app/(main)/admin/people/page.tsx`
- Modify: `src/components/admin/admin-tabs.tsx`

**Interfaces:**
- Consumes: People API (Task 6), i18n keys `assets.status.*`, `people.*`, `admin.tabs.people` (Task 5), `Badge` from `@/components/ui/badge`.
- Produces: `<AssetStatusBadge status={string} />` used by Tasks 13, 15, 16; `/admin/people` page; People tab in admin navigation.

- [ ] **Step 1: Create `src/components/assets/asset-status-badge.tsx`**

```tsx
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  idle: 'default',
  in_use: 'success',
  repair: 'warning',
  lent_out: 'info',
  lost: 'danger',
  scrapped: 'default',
}

export function AssetStatusBadge({ status }: { status: string }) {
  const t = useTranslations('assets.status')
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'default'} className={status === 'scrapped' ? 'line-through opacity-70' : undefined}>
      {t(status)}
    </Badge>
  )
}
```

- [ ] **Step 2: Create `src/app/(main)/admin/people/page.tsx`**

Clone the structure of `src/app/(main)/admin/users/page.tsx` (fetch list → cards → add/edit modal), adapted for people:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Contact, Plus, Trash2, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api'

interface Person {
  id: number
  name: string
  department: string | null
  email: string | null
  isActive: boolean
  createdAt: string
}

interface FormState {
  name: string
  department: string
  email: string
  isActive: boolean
}

const EMPTY_FORM: FormState = { name: '', department: '', email: '', isActive: true }

export default function PeoplePage() {
  const { toast } = useToast()
  const t = useTranslations('people')
  const tCommon = useTranslations('common')
  const [peopleList, setPeopleList] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchPeople = useCallback(async () => {
    try {
      const res = await apiFetch('/api/people')
      const json = await res.json()
      if (json.success) setPeopleList(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [toast, t])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  const openAdd = () => {
    setEditingPerson(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (person: Person) => {
    setEditingPerson(person)
    setForm({
      name: person.name,
      department: person.department ?? '',
      email: person.email ?? '',
      isActive: person.isActive,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingPerson(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast(t('nameRequired'), 'error')
      return
    }

    setSaving(true)
    try {
      const isEdit = !!editingPerson
      const url = isEdit ? `/api/people/${editingPerson.id}` : '/api/people'
      const method = isEdit ? 'PUT' : 'POST'

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        department: form.department.trim() || undefined,
        email: form.email.trim() || undefined,
      }
      if (isEdit) {
        body.isActive = form.isActive
      }

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast(isEdit ? t('updated') : t('created'), 'success')
        closeModal()
        await fetchPeople()
      } else {
        toast(json.error ?? (isEdit ? t('updateFailed') : t('createFailed')), 'error')
      }
    } catch {
      toast(editingPerson ? t('updateFailed') : t('createFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (person: Person) => {
    if (!confirm(t('confirmDelete', { name: person.name }))) return
    try {
      const res = await apiFetch(`/api/people/${person.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast(t('deleted'), 'success')
        await fetchPeople()
      } else {
        toast(json.error ?? t('deleteFailed'), 'error')
      }
    } catch {
      toast(t('deleteFailed'), 'error')
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{t('title')}</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={16} className="mr-1" />
          {t('add')}
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : peopleList.length === 0 ? (
        <EmptyState
          icon={<Contact size={40} />}
          title={t('noPeople')}
          description={t('noPeopleDesc')}
          action={
            <Button size="sm" onClick={openAdd}>
              {t('add')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {peopleList.map((person) => (
            <div key={person.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{person.name}</p>
                    {!person.isActive && <Badge variant="default">{t('inactive')}</Badge>}
                  </div>
                  {person.department && (
                    <p className="mt-0.5 text-sm text-gray-500">{person.department}</p>
                  )}
                  {person.email && <p className="mt-0.5 text-xs text-gray-400">{person.email}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(person)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(person)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingPerson ? t('modalEdit') : t('modalAdd')}>
        <div className="space-y-4">
          <Input
            id="person-name"
            label={t('nameLabel')}
            placeholder={t('namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            id="person-department"
            label={t('departmentLabel')}
            placeholder={t('departmentPlaceholder')}
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <Input
            id="person-email"
            label={t('emailLabel')}
            type="email"
            placeholder={t('emailPlaceholder')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {editingPerson && (
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              {t('activeLabel')}
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeModal}>
              {tCommon('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving
                ? (editingPerson ? t('saving') : t('creating'))
                : (editingPerson ? t('save') : t('create'))}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: Add tabs in `src/components/admin/admin-tabs.tsx`**

Update the icon import and tabs array:

```tsx
import { Users, Tag, MapPin, Contact, ClipboardCheck } from 'lucide-react'

const tabs = [
  { href: '/admin/users', key: 'users', icon: Users },
  { href: '/admin/categories', key: 'categories', icon: Tag },
  { href: '/admin/locations', key: 'locations', icon: MapPin },
  { href: '/admin/people', key: 'people', icon: Contact },
  { href: '/admin/scrap-approvals', key: 'scrapApprovals', icon: ClipboardCheck },
] as const
```

Also add `overflow-x-auto` to the tab container className so five tabs scroll on narrow screens: change `'flex gap-1 border-b border-gray-200 px-4 pt-3 pb-0'` to `'flex gap-1 overflow-x-auto border-b border-gray-200 px-4 pt-3 pb-0'` and add `whitespace-nowrap` to each Link's className list.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: build succeeds. (The `/admin/scrap-approvals` tab 404s until Task 16 — acceptable mid-plan.)

- [ ] **Step 5: Commit**

```bash
git add src/components/assets src/app/\(main\)/admin/people src/components/admin/admin-tabs.tsx
git commit -m "feat: people admin page, asset status badge, admin tabs"
```

---

### Task 13: Assets list page

**Files:**
- Create: `src/app/(main)/assets/page.tsx`

**Interfaces:**
- Consumes: `GET /api/assets` (Task 7), `GET /api/people` + `GET /api/categories`, `AssetStatusBadge` (Task 12), i18n `assets.*`, `ASSET_STATUSES` from `@/lib/asset-guards`.
- Produces: `/assets` page listing assets with search + status/custodian/category filters; each card links to `/assets/[id]`; header button links to `/assets/new`.

- [ ] **Step 1: Create `src/app/(main)/assets/page.tsx`**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Briefcase, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { AssetStatusBadge } from '@/components/assets/asset-status-badge'
import { ASSET_STATUSES } from '@/lib/asset-guards'
import { apiFetch } from '@/lib/api'

interface AssetRow {
  id: number
  assetNo: string
  name: string
  status: string
  custodian: { id: number; name: string } | null
  category: { id: number; name: string } | null
  location: { id: number; name: string } | null
}

interface Option {
  id: number
  name: string
}

export default function AssetsPage() {
  const t = useTranslations('assets')
  const { toast } = useToast()
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [custodianId, setCustodianId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [people, setPeople] = useState<Option[]>([])
  const [categories, setCategories] = useState<Option[]>([])

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [peopleRes, catRes] = await Promise.all([
          apiFetch('/api/people'),
          apiFetch('/api/categories'),
        ])
        const peopleJson = await peopleRes.json()
        const catJson = await catRes.json()
        if (peopleJson.success) setPeople(peopleJson.data)
        if (catJson.success) setCategories(catJson.data)
      } catch {
        // filters remain empty — list still works
      }
    }
    fetchOptions()
  }, [])

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (custodianId) params.set('custodianId', custodianId)
      if (categoryId) params.set('categoryId', categoryId)
      const res = await apiFetch(`/api/assets?${params.toString()}`)
      const json = await res.json()
      if (json.success) setAssets(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [search, status, custodianId, categoryId, toast, t])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const statusOptions = ASSET_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))
  const custodianOptions = people.map((p) => ({ value: p.id, label: p.name }))
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Link href="/assets/new">
          <Button size="sm">
            <Plus size={16} className="mr-1" />
            {t('add')}
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            id="asset-search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select
            id="filter-status"
            options={statusOptions}
            placeholder={t('allStatuses')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Select
            id="filter-custodian"
            options={custodianOptions}
            placeholder={t('allCustodians')}
            value={custodianId}
            onChange={(e) => setCustodianId(e.target.value)}
          />
          <Select
            id="filter-category"
            options={categoryOptions}
            placeholder={t('allCategories')}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={40} />}
          title={t('noAssets')}
          description={t('noAssetsDesc')}
          action={
            <Link href="/assets/new">
              <Button size="sm">{t('add')}</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900">{asset.name}</p>
                    <AssetStatusBadge status={asset.status} />
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-gray-500">{asset.assetNo}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {asset.custodian
                      ? `${t('custodian')}: ${asset.custodian.name}`
                      : asset.location?.name ?? ''}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

Note: check `src/components/ui/select.tsx` and `src/components/ui/input.tsx` prop types before finalizing — `Select` takes `{ id, label?, options: { value, label }[], placeholder, value, onChange }` per its usage in `item-form.tsx`; if `Input` has no `className` passthrough, drop the search icon and `pl-9`.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(main)/assets/page.tsx"
git commit -m "feat: assets list page with search and filters"
```

---

### Task 14: Asset form + new/edit pages (財產入帳)

**Files:**
- Create: `src/components/assets/asset-form.tsx`
- Create: `src/app/(main)/assets/new/page.tsx`
- Create: `src/app/(main)/assets/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `POST /api/assets`, `PUT /api/assets/[id]`, `GET /api/people?activeOnly=true`, `GET /api/categories`, `GET /api/locations`; i18n `assetForm.*`.
- Produces: `<AssetForm assetId?: number, initialData?: Partial<AssetFormData> />` — mirrors `ItemForm`'s contract; on success routes to `/assets/[id]`.

- [ ] **Step 1: Create `src/components/assets/asset-form.tsx`**

Follow `src/components/items/item-form.tsx` structure exactly (state shape, option fetching, payload building, toast handling):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api'

interface Option {
  id: number
  name: string
}

export interface AssetFormData {
  name: string
  assetNo: string
  description: string
  categoryId: string
  locationId: string
  custodianId: string
  acquiredAt: string
  cost: string
  vendor: string
  barcode: string
}

interface AssetFormProps {
  assetId?: number
  initialData?: Partial<AssetFormData>
}

const defaultFormData: AssetFormData = {
  name: '',
  assetNo: '',
  description: '',
  categoryId: '',
  locationId: '',
  custodianId: '',
  acquiredAt: '',
  cost: '',
  vendor: '',
  barcode: '',
}

export function AssetForm({ assetId, initialData }: AssetFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('assetForm')
  const tCommon = useTranslations('common')
  const [categories, setCategories] = useState<Option[]>([])
  const [locations, setLocations] = useState<Option[]>([])
  const [people, setPeople] = useState<Option[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<AssetFormData>({ ...defaultFormData, ...initialData })

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [catRes, locRes, peopleRes] = await Promise.all([
          apiFetch('/api/categories'),
          apiFetch('/api/locations'),
          apiFetch('/api/people?activeOnly=true'),
        ])
        const catJson = await catRes.json()
        const locJson = await locRes.json()
        const peopleJson = await peopleRes.json()
        if (catJson.success) setCategories(catJson.data)
        if (locJson.success) setLocations(locJson.data)
        if (peopleJson.success) setPeople(peopleJson.data)
      } catch (error) {
        console.error('Error fetching form options:', error)
      }
    }
    fetchOptions()
  }, [])

  function handleChange(field: keyof AssetFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      toast(t('nameRequired'), 'error')
      return
    }

    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      assetNo: form.assetNo.trim() || undefined,
      description: form.description.trim() || undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      locationId: form.locationId ? parseInt(form.locationId) : undefined,
      custodianId: form.custodianId ? parseInt(form.custodianId) : undefined,
      acquiredAt: form.acquiredAt || undefined,
      cost: form.cost ? parseFloat(form.cost) : undefined,
      vendor: form.vendor.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
    }

    try {
      const url = assetId ? `/api/assets/${assetId}` : '/api/assets'
      const method = assetId ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!json.success) {
        toast(json.error ?? t('saveFailed'), 'error')
        return
      }

      toast(assetId ? t('updatedSuccess') : t('createdSuccess'), 'success')
      router.push(assetId ? `/assets/${assetId}` : `/assets/${json.data.id}`)
    } catch {
      toast(tCommon('somethingWentWrong'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }))
  const peopleOptions = people.map((p) => ({ value: p.id, label: p.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="asset-name"
        label={t('nameLabel')}
        type="text"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder={t('namePlaceholder')}
        required
      />
      <Input
        id="asset-no"
        label={t('assetNoLabel')}
        type="text"
        value={form.assetNo}
        onChange={(e) => handleChange('assetNo', e.target.value)}
        placeholder={t('assetNoPlaceholder')}
      />
      <div className="space-y-1">
        <label htmlFor="asset-description" className="block text-sm font-medium text-gray-700">
          {t('descriptionLabel')}
        </label>
        <textarea
          id="asset-description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <Select
        id="asset-category"
        label={t('categoryLabel')}
        options={categoryOptions}
        placeholder={t('categoryPlaceholder')}
        value={form.categoryId}
        onChange={(e) => handleChange('categoryId', e.target.value)}
      />
      <Select
        id="asset-location"
        label={t('locationLabel')}
        options={locationOptions}
        placeholder={t('locationPlaceholder')}
        value={form.locationId}
        onChange={(e) => handleChange('locationId', e.target.value)}
      />
      {!assetId && (
        <Select
          id="asset-custodian"
          label={t('custodianLabel')}
          options={peopleOptions}
          placeholder={t('custodianPlaceholder')}
          value={form.custodianId}
          onChange={(e) => handleChange('custodianId', e.target.value)}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="asset-acquired-at"
          label={t('acquiredAtLabel')}
          type="date"
          value={form.acquiredAt}
          onChange={(e) => handleChange('acquiredAt', e.target.value)}
        />
        <Input
          id="asset-cost"
          label={t('costLabel')}
          type="number"
          min="0"
          step="0.01"
          value={form.cost}
          onChange={(e) => handleChange('cost', e.target.value)}
          placeholder={t('costPlaceholder')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="asset-vendor"
          label={t('vendorLabel')}
          type="text"
          value={form.vendor}
          onChange={(e) => handleChange('vendor', e.target.value)}
          placeholder={t('vendorPlaceholder')}
        />
        <Input
          id="asset-barcode"
          label={t('barcodeLabel')}
          type="text"
          value={form.barcode}
          onChange={(e) => handleChange('barcode', e.target.value)}
          placeholder={t('barcodePlaceholder')}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? tCommon('saving') : assetId ? t('updateAsset') : t('createAsset')}
        </Button>
      </div>
    </form>
  )
}
```

(Custodian select is hidden in edit mode — custody changes must go through Transfer so they are event-logged.)

- [ ] **Step 2: Create `src/app/(main)/assets/new/page.tsx`**

Check `src/app/(main)/items/new/page.tsx` first and mirror its page wrapper (title + form). Equivalent shape:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { AssetForm } from '@/components/assets/asset-form'

export default function NewAssetPage() {
  const t = useTranslations('assetForm')

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('createTitle')}</h1>
      <AssetForm />
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/(main)/assets/[id]/edit/page.tsx`**

Check `src/app/(main)/items/[id]/edit/page.tsx` first and mirror its fetch-then-form pattern. Equivalent shape:

```tsx
'use client'

import { useEffect, useState, use } from 'react'
import { useTranslations } from 'next-intl'
import { AssetForm, AssetFormData } from '@/components/assets/asset-form'
import { Loading } from '@/components/ui/loading'
import { apiFetch } from '@/lib/api'

export default function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('assetForm')
  const [initialData, setInitialData] = useState<Partial<AssetFormData> | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchAsset() {
      try {
        const res = await apiFetch(`/api/assets/${id}`)
        const json = await res.json()
        if (!json.success) {
          setNotFound(true)
          return
        }
        const a = json.data
        setInitialData({
          name: a.name,
          assetNo: a.assetNo,
          description: a.description ?? '',
          categoryId: a.categoryId ? String(a.categoryId) : '',
          locationId: a.locationId ? String(a.locationId) : '',
          custodianId: a.custodianId ? String(a.custodianId) : '',
          acquiredAt: a.acquiredAt ?? '',
          cost: a.cost != null ? String(a.cost) : '',
          vendor: a.vendor ?? '',
          barcode: a.barcode ?? '',
        })
      } catch {
        setNotFound(true)
      }
    }
    fetchAsset()
  }, [id])

  if (notFound) {
    return <p className="py-10 text-center text-sm text-gray-500">{t('saveFailed')}</p>
  }

  if (!initialData) {
    return <Loading />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('editTitle')}</h1>
      <AssetForm assetId={parseInt(id)} initialData={initialData} />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/assets/asset-form.tsx "src/app/(main)/assets/new" "src/app/(main)/assets/[id]/edit"
git commit -m "feat: asset registration and edit forms (財產入帳)"
```

---

### Task 15: Asset detail page (history, transfer, status, scrap request)

**Files:**
- Create: `src/app/(main)/assets/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/assets/[id]` (Task 8 — includes `events` and `pendingScrapRequest`), `POST /api/assets/[id]/transfer`, `POST /api/assets/[id]/status` (Task 9), `POST /api/scrap-requests` (Task 10), `GET /api/people?activeOnly=true`; `AssetStatusBadge` (Task 12); i18n `assetDetail.*`.
- Produces: `/assets/[id]` page.

- [ ] **Step 1: Create `src/app/(main)/assets/[id]/page.tsx`**

```tsx
'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { Pencil, ArrowLeftRight, RefreshCw, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Loading } from '@/components/ui/loading'
import { useToast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AssetStatusBadge } from '@/components/assets/asset-status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface PersonRef {
  id: number
  name: string
}

interface AssetEvent {
  id: number
  type: 'REGISTER' | 'TRANSFER' | 'STATUS_CHANGE' | 'SCRAP_REQUESTED' | 'SCRAP_APPROVED' | 'SCRAP_REJECTED'
  fromCustodian: PersonRef | null
  toCustodian: PersonRef | null
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  performer: PersonRef | null
  createdAt: string
}

interface AssetDetail {
  id: number
  assetNo: string
  name: string
  description: string | null
  status: string
  category: { name: string } | null
  location: { name: string } | null
  custodian: PersonRef | null
  acquiredAt: string | null
  cost: number | null
  vendor: string | null
  barcode: string | null
  scrappedAt: string | null
  scrapReason: string | null
  events: AssetEvent[]
  pendingScrapRequest: { id: number; reason: string } | null
}

const CHANGEABLE_STATUSES = ['idle', 'in_use', 'repair', 'lent_out', 'lost'] as const

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('assetDetail')
  const tStatus = useTranslations('assets.status')
  const tCommon = useTranslations('common')
  const { toast } = useToast()
  const [asset, setAsset] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<PersonRef[]>([])
  const [activeModal, setActiveModal] = useState<'transfer' | 'status' | 'scrap' | null>(null)
  const [transferCustodianId, setTransferCustodianId] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [scrapReason, setScrapReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchAsset = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/assets/${id}`)
      const json = await res.json()
      if (json.success) setAsset(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast, t])

  useEffect(() => {
    fetchAsset()
  }, [fetchAsset])

  useEffect(() => {
    async function fetchPeople() {
      try {
        const res = await apiFetch('/api/people?activeOnly=true')
        const json = await res.json()
        if (json.success) setPeople(json.data)
      } catch {
        // transfer modal will show empty custodian list
      }
    }
    fetchPeople()
  }, [])

  function closeModal() {
    setActiveModal(null)
    setTransferCustodianId('')
    setTransferNote('')
    setNewStatus('')
    setStatusNote('')
    setScrapReason('')
  }

  async function submitAction(url: string, body: object, successMsg: string, failMsg: string) {
    setSubmitting(true)
    try {
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast(successMsg, 'success')
        closeModal()
        setLoading(true)
        await fetchAsset()
      } else {
        toast(json.error ?? failMsg, 'error')
      }
    } catch {
      toast(failMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleTransfer() {
    if (!transferCustodianId) {
      toast(t('transferModal.custodianRequired'), 'error')
      return
    }
    submitAction(
      `/api/assets/${id}/transfer`,
      { custodianId: parseInt(transferCustodianId), note: transferNote.trim() || undefined },
      t('transferModal.success'),
      t('transferModal.failed')
    )
  }

  function handleStatusChange() {
    if (!newStatus) return
    submitAction(
      `/api/assets/${id}/status`,
      { status: newStatus, note: statusNote.trim() || undefined },
      t('statusModal.success'),
      t('statusModal.failed')
    )
  }

  function handleScrapRequest() {
    if (!scrapReason.trim()) {
      toast(t('scrapModal.reasonRequired'), 'error')
      return
    }
    submitAction(
      '/api/scrap-requests',
      { assetId: parseInt(id), reason: scrapReason.trim() },
      t('scrapModal.success'),
      t('scrapModal.failed')
    )
  }

  if (loading) return <Loading />
  if (!asset) {
    return <p className="py-10 text-center text-sm text-gray-500">{t('notFound')}</p>
  }

  const actionable = asset.status !== 'scrapped' && !asset.pendingScrapRequest
  const custodianOptions = people.map((p) => ({ value: p.id, label: p.name }))
  const statusOptions = CHANGEABLE_STATUSES.filter((s) => s !== asset.status).map((s) => ({
    value: s,
    label: tStatus(s),
  }))

  const infoRows: Array<[string, string]> = [
    [t('assetNo'), asset.assetNo],
    [t('custodian'), asset.custodian?.name ?? t('noCustodian')],
    ...(asset.category ? ([[t('category'), asset.category.name]] as Array<[string, string]>) : []),
    ...(asset.location ? ([[t('location'), asset.location.name]] as Array<[string, string]>) : []),
    ...(asset.acquiredAt ? ([[t('acquiredAt'), asset.acquiredAt]] as Array<[string, string]>) : []),
    ...(asset.cost != null ? ([[t('cost'), formatCurrency(asset.cost)]] as Array<[string, string]>) : []),
    ...(asset.vendor ? ([[t('vendor'), asset.vendor]] as Array<[string, string]>) : []),
    ...(asset.barcode ? ([[t('barcode'), asset.barcode]] as Array<[string, string]>) : []),
    ...(asset.scrappedAt
      ? ([[t('scrappedAt'), formatDate(asset.scrappedAt)]] as Array<[string, string]>)
      : []),
    ...(asset.scrapReason ? ([[t('scrapReason'), asset.scrapReason]] as Array<[string, string]>) : []),
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-900">{asset.name}</h1>
            <AssetStatusBadge status={asset.status} />
          </div>
          {asset.description && <p className="mt-1 text-sm text-gray-500">{asset.description}</p>}
        </div>
      </div>

      {asset.pendingScrapRequest && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          {t('pendingScrapNotice')}
        </div>
      )}

      <Card>
        <CardContent>
          <dl className="divide-y divide-gray-100">
            {infoRows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-right font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {actionable && (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/assets/${asset.id}/edit`}>
            <Button variant="secondary" className="w-full">
              <Pencil size={16} className="mr-1" />
              {t('edit')}
            </Button>
          </Link>
          <Button className="w-full" onClick={() => setActiveModal('transfer')}>
            <ArrowLeftRight size={16} className="mr-1" />
            {t('transfer')}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setActiveModal('status')}>
            <RefreshCw size={16} className="mr-1" />
            {t('changeStatus')}
          </Button>
          <Button variant="danger" className="w-full" onClick={() => setActiveModal('scrap')}>
            <Trash2 size={16} className="mr-1" />
            {t('requestScrap')}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {asset.events.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('noEvents')}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {asset.events.map((event) => (
                <div key={event.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{t(`events.${event.type}`)}</p>
                    <p className="shrink-0 text-xs text-gray-400">{formatDate(event.createdAt)}</p>
                  </div>
                  {event.type === 'TRANSFER' && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {event.fromCustodian?.name ?? '—'} → {event.toCustodian?.name ?? '—'}
                    </p>
                  )}
                  {event.type === 'STATUS_CHANGE' && event.fromStatus && event.toStatus && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {tStatus(event.fromStatus)} → {tStatus(event.toStatus)}
                    </p>
                  )}
                  {event.note && <p className="mt-0.5 text-xs text-gray-500">{event.note}</p>}
                  {event.performer && (
                    <p className="mt-0.5 text-xs text-gray-400">{event.performer.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={activeModal === 'transfer'} onClose={closeModal} title={t('transferModal.title')}>
        <div className="space-y-4">
          <Select
            id="transfer-custodian"
            label={t('transferModal.custodianLabel')}
            options={custodianOptions.filter((o) => o.value !== asset.custodian?.id)}
            placeholder={t('transferModal.custodianPlaceholder')}
            value={transferCustodianId}
            onChange={(e) => setTransferCustodianId(e.target.value)}
          />
          <NoteTextarea
            id="transfer-note"
            label={t('transferModal.noteLabel')}
            value={transferNote}
            onChange={setTransferNote}
          />
          <ModalActions
            onCancel={closeModal}
            onSubmit={handleTransfer}
            submitLabel={t('transferModal.submit')}
            cancelLabel={tCommon('cancel')}
            submitting={submitting}
          />
        </div>
      </Modal>

      <Modal open={activeModal === 'status'} onClose={closeModal} title={t('statusModal.title')}>
        <div className="space-y-4">
          <Select
            id="new-status"
            label={t('statusModal.statusLabel')}
            options={statusOptions}
            placeholder={t('statusModal.statusLabel')}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <NoteTextarea
            id="status-note"
            label={t('statusModal.noteLabel')}
            value={statusNote}
            onChange={setStatusNote}
          />
          <ModalActions
            onCancel={closeModal}
            onSubmit={handleStatusChange}
            submitLabel={t('statusModal.submit')}
            cancelLabel={tCommon('cancel')}
            submitting={submitting}
          />
        </div>
      </Modal>

      <Modal open={activeModal === 'scrap'} onClose={closeModal} title={t('scrapModal.title')}>
        <div className="space-y-4">
          <NoteTextarea
            id="scrap-reason"
            label={t('scrapModal.reasonLabel')}
            placeholder={t('scrapModal.reasonPlaceholder')}
            value={scrapReason}
            onChange={setScrapReason}
          />
          <ModalActions
            onCancel={closeModal}
            onSubmit={handleScrapRequest}
            submitLabel={t('scrapModal.submit')}
            cancelLabel={tCommon('cancel')}
            submitting={submitting}
            danger
          />
        </div>
      </Modal>
    </div>
  )
}

function NoteTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitting,
  danger,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  cancelLabel: string
  submitting: boolean
  danger?: boolean
}) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="secondary" className="flex-1" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        className="flex-1"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitLabel}
      </Button>
    </div>
  )
}
```

Note: check `src/components/ui/button.tsx` for its actual `variant` union before using `'danger'`/`'primary'` — if the names differ (e.g. `'destructive'` or default-without-variant), use the existing names. Viewer-role users get the read-only view; server-side 403s are the real enforcement.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(main)/assets/[id]/page.tsx"
git commit -m "feat: asset detail page with history, transfer, status, scrap request"
```

---

### Task 16: Scrap approvals admin page

**Files:**
- Create: `src/app/(main)/admin/scrap-approvals/page.tsx`

**Interfaces:**
- Consumes: `GET /api/scrap-requests?status=pending`, `POST /api/scrap-requests/[id]/review` (Task 10); i18n `scrapRequests.*`.
- Produces: `/admin/scrap-approvals` page (tab added in Task 12).

- [ ] **Step 1: Create `src/app/(main)/admin/scrap-approvals/page.tsx`**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface ScrapRequestRow {
  id: number
  reason: string
  createdAt: string
  asset: { id: number; name: string; assetNo: string }
  requester: { id: number; name: string } | null
}

export default function ScrapApprovalsPage() {
  const t = useTranslations('scrapRequests')
  const tCommon = useTranslations('common')
  const { toast } = useToast()
  const [requests, setRequests] = useState<ScrapRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<{ request: ScrapRequestRow; action: 'approve' | 'reject' } | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiFetch('/api/scrap-requests?status=pending&limit=100')
      const json = await res.json()
      if (json.success) setRequests(json.data)
    } catch {
      toast(t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [toast, t])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  function closeModal() {
    setReviewing(null)
    setReviewNote('')
  }

  async function handleReview() {
    if (!reviewing) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/scrap-requests/${reviewing.request.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewing.action,
          reviewNote: reviewNote.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast(reviewing.action === 'approve' ? t('approved') : t('rejected'), 'success')
        closeModal()
        setLoading(true)
        await fetchRequests()
      } else {
        toast(json.error ?? t('reviewFailed'), 'error')
      }
    } catch {
      toast(t('reviewFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900">{t('title')}</h1>

      {loading ? (
        <Loading />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={40} />}
          title={t('noRequests')}
          description={t('noRequestsDesc')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <Link href={`/assets/${request.asset.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                {request.asset.name}
              </Link>
              <p className="mt-0.5 font-mono text-xs text-gray-500">{request.asset.assetNo}</p>
              <p className="mt-2 text-sm text-gray-700">
                <span className="text-gray-500">{t('reason')}: </span>
                {request.reason}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {t('requestedBy', { name: request.requester?.name ?? '—' })} · {formatDate(request.createdAt)}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setReviewing({ request, action: 'approve' })}
                >
                  <Check size={16} className="mr-1" />
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setReviewing({ request, action: 'reject' })}
                >
                  <X size={16} className="mr-1" />
                  {t('reject')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!reviewing}
        onClose={closeModal}
        title={reviewing?.action === 'approve' ? t('approveTitle') : t('rejectTitle')}
      >
        <div className="space-y-4">
          {reviewing && (
            <p className="text-sm text-gray-700">
              {reviewing.request.asset.name}{' '}
              <span className="font-mono text-xs text-gray-500">{reviewing.request.asset.assetNo}</span>
            </p>
          )}
          <div className="space-y-1">
            <label htmlFor="review-note" className="block text-sm font-medium text-gray-700">
              {t('reviewNoteLabel')}
            </label>
            <textarea
              id="review-note"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeModal}>
              {tCommon('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleReview} disabled={submitting}>
              {t('confirmSubmit')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(main)/admin/scrap-approvals"
git commit -m "feat: scrap approval admin page (報廢審核)"
```

---

### Task 17: Navigation, dashboard cards, proxy, scan page

**Files:**
- Modify: `src/components/layout/bottom-nav.tsx`
- Modify: `src/app/(main)/dashboard/page.tsx`
- Modify: `src/proxy.ts`
- Modify: `src/app/(main)/scan/page.tsx`

**Interfaces:**
- Consumes: `matchType` from scan API (Task 11), `meta.total` from assets/scrap-requests GET (Tasks 7, 10), i18n keys `nav.assets`, `dashboard.stats.*` (Task 5).

- [ ] **Step 1: Add Assets to `src/components/layout/bottom-nav.tsx`**

Update the icon import and navItems (assets after items):

```tsx
import { Home, Package, Briefcase, Camera, ArrowLeftRight, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/dashboard', key: 'home', icon: Home },
  { href: '/items', key: 'items', icon: Package },
  { href: '/scan', key: 'scan', icon: Camera },
  { href: '/assets', key: 'assets', icon: Briefcase },
  { href: '/activity', key: 'activity', icon: ArrowLeftRight },
  { href: '/reports', key: 'reports', icon: BarChart3 },
] as const
```

(Scan stays in the center position — it is the visually elevated button; assets goes beside it. Six items fit `justify-around` on mobile; reduce each Link's `px-3` to `px-2` to be safe.)

- [ ] **Step 2: Add asset stats to `src/app(main)/dashboard/page.tsx`**

Add to the `SummaryData` usage — extend the component state and fetch:

```tsx
interface AssetSummary {
  totalAssets: number
  assetsInUse: number
  pendingScrap: number
}
```

Add `const [assetSummary, setAssetSummary] = useState<AssetSummary | null>(null)` and extend `fetchData` to also fetch (inside the existing `Promise.all`):

```tsx
const [summaryRes, txRes, assetsRes, inUseRes, scrapRes] = await Promise.all([
  apiFetch('/api/reports?type=summary'),
  apiFetch('/api/transactions?limit=10'),
  apiFetch('/api/assets?limit=1'),
  apiFetch('/api/assets?status=in_use&limit=1'),
  apiFetch('/api/scrap-requests?status=pending&limit=1'),
])
```

then after the existing json handling:

```tsx
const assetsJson = await assetsRes.json()
const inUseJson = await inUseRes.json()
const scrapJson = await scrapRes.json()
if (assetsJson.success && inUseJson.success && scrapJson.success) {
  setAssetSummary({
    totalAssets: assetsJson.meta.total,
    assetsInUse: inUseJson.meta.total,
    pendingScrap: scrapJson.meta.total,
  })
}
```

Add a second stat grid after the existing one (imports: add `Briefcase`, `UserCheck`, `ClipboardCheck` to the lucide import and `Link` from `next/link`):

```tsx
{assetSummary && (
  <div className="grid grid-cols-3 gap-3">
    <Link href="/assets">
      <StatCard
        label={t('stats.totalAssets')}
        value={assetSummary.totalAssets}
        icon={<Briefcase size={20} />}
        color="blue"
      />
    </Link>
    <Link href="/assets?status=in_use">
      <StatCard
        label={t('stats.assetsInUse')}
        value={assetSummary.assetsInUse}
        icon={<UserCheck size={20} />}
        color="green"
      />
    </Link>
    <Link href="/admin/scrap-approvals">
      <StatCard
        label={t('stats.pendingScrap')}
        value={assetSummary.pendingScrap}
        icon={<ClipboardCheck size={20} />}
        color="yellow"
      />
    </Link>
  </div>
)}
```

Note: check `src/components/reports/stat-card.tsx` for its `color` union; use only existing values.

- [ ] **Step 3: Add `/assets` to the proxy matcher in `src/proxy.ts`**

```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/items/:path*',
    '/assets/:path*',
    '/scan/:path*',
    '/activity/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/api/((?!auth).*)',
  ],
}
```

- [ ] **Step 4: Handle asset matches in `src/app/(main)/scan/page.tsx`**

Add `import { useRouter } from 'next/navigation'` and `const router = useRouter()` inside the component. In `handleScan`, replace the success branch:

```tsx
if (json.success) {
  if (json.matchType === 'asset') {
    router.push(`/assets/${json.data.id}`)
    return
  }
  setFoundItem(json.data)
  setState('found')
} else {
  setState('not-found')
}
```

Also add `router` to the `useCallback` dependency array: `[state, router]`.

- [ ] **Step 5: Verify build and tests**

Run: `pnpm build`
Expected: build succeeds.

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/bottom-nav.tsx "src/app/(main)/dashboard/page.tsx" src/proxy.ts "src/app/(main)/scan/page.tsx"
git commit -m "feat: asset navigation, dashboard stats, proxy matcher, scan routing"
```

---

### Task 18: Final verification + docs

**Files:**
- Modify: `CLAUDE.md` (project structure + database sections)

- [ ] **Step 1: Full test suite, lint, build**

Run: `pnpm test`
Expected: all tests pass (24 original + new asset tests).

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 2: Manual end-to-end verification**

Run `pnpm dev`, log in as `admin@pmm.local` / `admin123`, and walk the full lifecycle:

1. `/admin/people` → add a person (e.g. 王小明, IT dept).
2. `/assets/new` → register an asset with blank assetNo → verify it gets `AST-2026-0001` and status 在庫; register a second asset with custodian 王小明 → status 使用中.
3. `/assets` → both appear; filter by status and custodian works.
4. Asset detail → Transfer to another person → history shows TRANSFER with from/to.
5. Change status to 維修中 → history shows STATUS_CHANGE.
6. Request scrap with a reason → pending notice appears; Transfer/Edit/Change Status buttons disappear; a second scrap request from the API returns 400.
7. `/admin/scrap-approvals` → approve → asset becomes 已報廢, custodian cleared; history shows SCRAP_APPROVED; action buttons stay hidden.
8. Dashboard shows the three asset stat cards with correct counts.
9. Scan an asset's barcode (or enter its assetNo via the scan API) → lands on asset detail.
10. Switch language to 中文 → all new pages render zh-TW strings.

- [ ] **Step 3: Update `CLAUDE.md`**

In the Project Structure section add under `src/app/(main)/`: `assets/` (list, detail, new, edit) and `admin/` gains people + scrap-approvals. Under `components/`: `assets/` (AssetForm, AssetStatusBadge). In the Database section, extend the tables list: `..., transactions, checkouts, people, assets, assetEvents, scrapRequests`. In Architecture Decisions add one bullet:

```markdown
- **Asset management** (hybrid model): quantity-based `items` for consumables; per-unit `assets` with custodian (`people` registry), full lifecycle status, immutable `assetEvents` history, and a request+approve scrap flow (`scrapRequests`). Asset business rules live in `src/lib/asset-no.ts` and `src/lib/asset-guards.ts`.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document asset management module in CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** 財產入帳 (Tasks 7, 14), 換人使用 (Tasks 9, 15), 報廢除帳 (Tasks 10, 15, 16), people registry (Tasks 6, 12), lifecycle statuses (Tasks 1, 4, 9), asset numbers (Tasks 3, 7), scan integration (Tasks 11, 17), dashboard (Task 17), permissions (each API task), i18n (Task 5), guards/error handling (Tasks 4, 8–10), tests (Tasks 2–4), CLAUDE.md (Task 18). `imageUrl` exists in the schema but has no upload UI — matches the existing items feature, which also stores `imageUrl` without an uploader; not a gap.
- **Type consistency:** `assetActionBlockReason(status, hasPendingScrap)` used identically in Tasks 8, 9, 10; `pendingScrapRequest` key name consistent between Task 8 (API) and Task 15 (UI); i18n keys in Tasks 12–17 all defined in Task 5.
- **Known flexibility points (deliberate, called out inline):** UI component prop unions (`Button` variants, `StatCard` colors, `Select`/`Input` props) and the session-user-id expression must be checked against the actual components when implementing — the plan says exactly where to look.
