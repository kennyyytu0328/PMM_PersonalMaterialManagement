# Asset Info on Activity & Reports Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface asset lifecycle events on the Activity page (Items | Assets tabs) and asset statistics on the Reports page.

**Architecture:** New `GET /api/asset-events` endpoint mirrors `/api/transactions`; a new `type=asset-summary` branch extends `/api/reports`. The Activity page gains a client-side tab switch with a lazily-fetched asset-events list; the Reports page appends an asset stats section. Spec: `docs/superpowers/specs/2026-07-13-asset-activity-reports-design.md`.

**Tech Stack:** Next.js 16 App Router route handlers, Drizzle ORM (better-sqlite3), NextAuth v5 `auth()`, next-intl, Tailwind CSS 4, Vitest.

## Global Constraints

- API response envelope: `{ success: boolean, data?: T, error?: string, meta?: { total, page, limit } }`
- Immutable patterns only — never mutate objects/arrays; spread into new ones
- No `console.log` (existing `console.error` pattern in catch blocks is allowed)
- Every user-facing string added to BOTH `messages/en.json` and `messages/zh-TW.json`
- Never select `passwordHash` in API relation columns
- Files < 400 lines target, 800 max
- Auth: every handler calls `auth()` and returns 401 `{ success: false, error: 'Unauthorized' }` without a session
- Commands: `pnpm test` (Vitest), `pnpm lint`, `pnpm build`
- Commit message format: `<type>: <description>` (feat/fix/docs/test/chore)

---

### Task 1: `GET /api/asset-events` endpoint

**Files:**
- Create: `__tests__/api/asset-events.test.ts`
- Create: `src/app/api/asset-events/route.ts`

**Interfaces:**
- Consumes: `assetEvents`, `assets`, `people`, `users` tables and `assetEventsRelations` (already defined in `src/db/schema.ts` — relations `asset`, `fromCustodian`, `toCustodian`, `performer` all exist; no schema change).
- Produces: `GET /api/asset-events?page&limit&assetId&type` returning `{ success: true, data: AssetEvent[], meta: { total, page, limit, totalPages } }` where each event includes relations `asset` (full row), `fromCustodian`/`toCustodian` (people rows or null), `performer` (`{ id, name, email, role, createdAt }`). Consumed by Task 3.

**Note on test technique (first route-handler test in this repo):** `src/db/index.ts` opens `./data/pmm.db` at import time, so tests replace the whole `@/db` module with an in-memory SQLite database and apply the real migrations from `src/db/migrations`. `@/lib/auth` is replaced with a `vi.hoisted` mock function. Route handlers only call `new URL(request.url)` on the request, so a plain `Request` cast to `NextRequest` is sufficient.

- [ ] **Step 1: Commit the spec and this plan**

```bash
git add docs/superpowers/specs/2026-07-13-asset-activity-reports-design.md docs/superpowers/plans/2026-07-13-asset-activity-reports.md
git commit -m "docs: spec and plan for asset info on activity/reports pages"
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/api/asset-events.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { db } from '@/db'
import { users, people, assets, assetEvents } from '@/db/schema'
import { GET } from '@/app/api/asset-events/route'

const authMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: authMock }))

vi.mock('@/db', async () => {
  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator')
  const schema = await import('@/db/schema')
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: 'src/db/migrations' })
  return { db: testDb }
})

function makeRequest(qs = '') {
  return new Request(`http://localhost/api/asset-events${qs}`) as unknown as NextRequest
}

beforeEach(async () => {
  authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } })
  await db.delete(assetEvents)
  await db.delete(assets)
  await db.delete(people)
  await db.delete(users)
  await db.insert(users).values({
    id: 1,
    name: 'Admin',
    email: 'admin@test.local',
    passwordHash: 'hash',
    role: 'admin',
  })
  await db.insert(people).values([
    { id: 1, name: 'Ken' },
    { id: 2, name: 'Amy' },
  ])
  await db.insert(assets).values([
    { id: 1, assetNo: 'AST-2026-0001', name: 'Laptop', status: 'in_use' },
    { id: 2, assetNo: 'AST-2026-0002', name: 'Monitor', status: 'repair' },
  ])
  await db.insert(assetEvents).values([
    { id: 1, assetId: 1, type: 'REGISTER', performedBy: 1, createdAt: '2026-07-01 08:00:00' },
    {
      id: 2,
      assetId: 1,
      type: 'TRANSFER',
      fromCustodianId: 1,
      toCustodianId: 2,
      performedBy: 1,
      createdAt: '2026-07-02 08:00:00',
    },
    {
      id: 3,
      assetId: 2,
      type: 'STATUS_CHANGE',
      fromStatus: 'idle',
      toStatus: 'repair',
      performedBy: 1,
      createdAt: '2026-07-03 08:00:00',
    },
  ])
})

describe('GET /api/asset-events', () => {
  it('returns 401 without a session', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('returns events newest first with relations and pagination meta', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.map((e: { id: number }) => e.id)).toEqual([3, 2, 1])
    const transfer = json.data[1]
    expect(transfer.asset.assetNo).toBe('AST-2026-0001')
    expect(transfer.fromCustodian.name).toBe('Ken')
    expect(transfer.toCustodian.name).toBe('Amy')
    expect(transfer.performer.name).toBe('Admin')
    expect(transfer.performer.passwordHash).toBeUndefined()
    expect(json.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 })
  })

  it('filters by type', async () => {
    const res = await GET(makeRequest('?type=TRANSFER'))
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].type).toBe('TRANSFER')
  })

  it('ignores an invalid type filter', async () => {
    const res = await GET(makeRequest('?type=BOGUS'))
    const json = await res.json()
    expect(json.data).toHaveLength(3)
  })

  it('filters by assetId', async () => {
    const res = await GET(makeRequest('?assetId=2'))
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].assetId).toBe(2)
  })

  it('paginates', async () => {
    const res = await GET(makeRequest('?page=2&limit=2'))
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe(1)
    expect(json.meta).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2 })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run __tests__/api/asset-events.test.ts`
Expected: FAIL — cannot resolve `@/app/api/asset-events/route` (module does not exist).

- [ ] **Step 4: Write the implementation**

Create `src/app/api/asset-events/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { assetEvents } from '@/db/schema'
import { eq, desc, count, SQL, and } from 'drizzle-orm'

const EVENT_TYPES = [
  'REGISTER',
  'TRANSFER',
  'STATUS_CHANGE',
  'SCRAP_REQUESTED',
  'SCRAP_APPROVED',
  'SCRAP_REJECTED',
] as const

type AssetEventType = (typeof EVENT_TYPES)[number]

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    const conditions: SQL[] = []

    if (assetId) {
      conditions.push(eq(assetEvents.assetId, parseInt(assetId)))
    }

    if (type && (EVENT_TYPES as readonly string[]).includes(type)) {
      conditions.push(eq(assetEvents.type, type as AssetEventType))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [events, [{ total }]] = await Promise.all([
      db.query.assetEvents.findMany({
        where,
        with: {
          asset: true,
          fromCustodian: true,
          toCustodian: true,
          performer: {
            columns: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
        limit,
        offset,
        orderBy: desc(assetEvents.createdAt),
      }),
      db.select({ total: count() }).from(assetEvents).where(where),
    ])

    return NextResponse.json({
      success: true,
      data: events,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch asset events' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run __tests__/api/asset-events.test.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 6: Run the full suite and commit**

Run: `pnpm test` — expected: all tests pass.

```bash
git add __tests__/api/asset-events.test.ts src/app/api/asset-events/route.ts
git commit -m "feat: add GET /api/asset-events endpoint"
```

---

### Task 2: `type=asset-summary` branch in `/api/reports`

**Files:**
- Create: `__tests__/api/reports-asset-summary.test.ts`
- Modify: `src/app/api/reports/route.ts` (imports at lines 4–5; new branch before the final unknown-type return at line ~170)

**Interfaces:**
- Consumes: `assets`, `scrapRequests` tables from `src/db/schema.ts`.
- Produces: `GET /api/reports?type=asset-summary` returning `{ success: true, data: { totalAssets: number, totalValue: number, activeValue: number, inUse: number, pendingScrap: number, byStatus: Array<{ status: string, count: number }> } }`. `byStatus` contains only statuses present in the DB (client zero-fills). Consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/reports-asset-summary.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { db } from '@/db'
import { users, assets, scrapRequests } from '@/db/schema'
import { GET } from '@/app/api/reports/route'

const authMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ auth: authMock }))

vi.mock('@/db', async () => {
  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator')
  const schema = await import('@/db/schema')
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const testDb = drizzle(sqlite, { schema })
  migrate(testDb, { migrationsFolder: 'src/db/migrations' })
  return { db: testDb }
})

function makeRequest(qs = '') {
  return new Request(`http://localhost/api/reports${qs}`) as unknown as NextRequest
}

beforeEach(async () => {
  authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } })
  await db.delete(scrapRequests)
  await db.delete(assets)
  await db.delete(users)
  await db.insert(users).values({
    id: 1,
    name: 'Admin',
    email: 'admin@test.local',
    passwordHash: 'hash',
    role: 'admin',
  })
})

describe('GET /api/reports?type=asset-summary', () => {
  it('returns 401 without a session', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(makeRequest('?type=asset-summary'))
    expect(res.status).toBe(401)
  })

  it('returns zeros for an empty database', async () => {
    const res = await GET(makeRequest('?type=asset-summary'))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      totalAssets: 0,
      totalValue: 0,
      activeValue: 0,
      inUse: 0,
      pendingScrap: 0,
      byStatus: [],
    })
  })

  it('computes stats; activeValue excludes scrapped and lost', async () => {
    await db.insert(assets).values([
      { id: 1, assetNo: 'A-1', name: 'Desk', status: 'idle', cost: 1000 },
      { id: 2, assetNo: 'A-2', name: 'Laptop', status: 'in_use', cost: 2000 },
      { id: 3, assetNo: 'A-3', name: 'Chair', status: 'in_use', cost: null },
      { id: 4, assetNo: 'A-4', name: 'Printer', status: 'repair', cost: 500 },
      { id: 5, assetNo: 'A-5', name: 'Phone', status: 'lost', cost: 800 },
      { id: 6, assetNo: 'A-6', name: 'Old PC', status: 'scrapped', cost: 300 },
    ])
    await db.insert(scrapRequests).values([
      { id: 1, assetId: 1, reason: 'broken', requestedBy: 1, status: 'pending' },
      { id: 2, assetId: 4, reason: 'worn out', requestedBy: 1, status: 'pending' },
      { id: 3, assetId: 6, reason: 'obsolete', requestedBy: 1, status: 'approved' },
    ])

    const res = await GET(makeRequest('?type=asset-summary'))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.totalAssets).toBe(6)
    expect(json.data.totalValue).toBe(4600)
    expect(json.data.activeValue).toBe(3500)
    expect(json.data.inUse).toBe(2)
    expect(json.data.pendingScrap).toBe(2)
    const statusMap = Object.fromEntries(
      json.data.byStatus.map((row: { status: string; count: number }) => [row.status, row.count])
    )
    expect(statusMap).toEqual({ idle: 1, in_use: 2, repair: 1, lost: 1, scrapped: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run __tests__/api/reports-asset-summary.test.ts`
Expected: FAIL — the two non-401 tests get 400 `Unknown report type: asset-summary`.

- [ ] **Step 3: Implement the branch**

In `src/app/api/reports/route.ts`:

1. Extend the schema import (line 4) to:

```typescript
import { items, transactions, checkouts, categories, locations, assets, scrapRequests } from '@/db/schema'
```

2. Insert this block immediately BEFORE the final `return NextResponse.json({ success: false, error: \`Unknown report type...\` })`:

```typescript
    if (type === 'asset-summary') {
      const [[{ totalAssets }], allAssets, [{ pendingScrap }], byStatus] = await Promise.all([
        db.select({ totalAssets: count() }).from(assets),
        db.select({ status: assets.status, cost: assets.cost }).from(assets),
        db
          .select({ pendingScrap: count() })
          .from(scrapRequests)
          .where(eq(scrapRequests.status, 'pending')),
        db
          .select({ status: assets.status, count: count() })
          .from(assets)
          .groupBy(assets.status),
      ])

      const totalValue = allAssets.reduce((acc, asset) => acc + (asset.cost ?? 0), 0)
      const activeValue = allAssets
        .filter((asset) => asset.status !== 'scrapped' && asset.status !== 'lost')
        .reduce((acc, asset) => acc + (asset.cost ?? 0), 0)
      const inUse = allAssets.filter((asset) => asset.status === 'in_use').length

      return NextResponse.json({
        success: true,
        data: { totalAssets, totalValue, activeValue, inUse, pendingScrap, byStatus },
      })
    }
```

3. Update the unknown-type error message to list the new type:

```typescript
    return NextResponse.json(
      { success: false, error: `Unknown report type: ${type}. Use: summary, movements, low-stock, checkouts, asset-summary` },
      { status: 400 }
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run __tests__/api/reports-asset-summary.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Run the full suite and commit**

Run: `pnpm test` — expected: all tests pass.

```bash
git add __tests__/api/reports-asset-summary.test.ts src/app/api/reports/route.ts
git commit -m "feat: add asset-summary report type"
```

---

### Task 3: Activity page tabs (Items | Assets)

**Files:**
- Create: `src/components/activity/asset-event-row.tsx`
- Modify: `src/app/(main)/activity/page.tsx` (full rewrite below)
- Modify: `messages/en.json` (`activity` namespace, after `"unknownItem"` line ~173)
- Modify: `messages/zh-TW.json` (`activity` namespace, same position)

**Interfaces:**
- Consumes: `GET /api/asset-events?page&limit` from Task 1; existing `Badge`, `Button`, `Loading`, `EmptyState`, `apiFetch`, `formatDate`, `cn`; i18n keys `assetDetail.events.*`, `assets.status.*`.
- Produces: `AssetEventRow({ event: AssetEventEntry })` and exported type `AssetEventEntry` in `src/components/activity/asset-event-row.tsx`.

No component unit tests (per spec §6, UI is verified manually in Task 5); test cycle here = build + lint gates.

- [ ] **Step 1: Add i18n keys**

In `messages/en.json`, inside the `"activity"` object after `"unknownItem": "Unknown Item",`:

```json
    "unknownAsset": "Unknown Asset",
    "tabItems": "Items",
    "tabAssets": "Assets",
    "noAssetEvents": "No asset events yet",
    "noAssetEventsDesc": "Asset registrations, transfers, and status changes will appear here.",
```

In `messages/zh-TW.json`, inside `"activity"` after `"unknownItem": "未知物品",`:

```json
    "unknownAsset": "未知資產",
    "tabItems": "物品",
    "tabAssets": "資產",
    "noAssetEvents": "尚無資產紀錄",
    "noAssetEventsDesc": "資產登錄、轉移與狀態變更會出現在這裡。",
```

- [ ] **Step 2: Create the asset event row component**

Create `src/components/activity/asset-event-row.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

export interface AssetEventEntry {
  id: number
  assetId: number
  type:
    | 'REGISTER'
    | 'TRANSFER'
    | 'STATUS_CHANGE'
    | 'SCRAP_REQUESTED'
    | 'SCRAP_APPROVED'
    | 'SCRAP_REJECTED'
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  createdAt: string
  asset?: { id: number; name: string; assetNo: string }
  fromCustodian?: { id: number; name: string } | null
  toCustodian?: { id: number; name: string } | null
  performer?: { id: number; name: string }
}

const EVENT_VARIANT: Record<
  AssetEventEntry['type'],
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  REGISTER: 'info',
  TRANSFER: 'info',
  STATUS_CHANGE: 'default',
  SCRAP_REQUESTED: 'warning',
  SCRAP_APPROVED: 'danger',
  SCRAP_REJECTED: 'default',
}

export function AssetEventRow({ event }: { event: AssetEventEntry }) {
  const t = useTranslations('activity')
  const tEvents = useTranslations('assetDetail.events')
  const tStatus = useTranslations('assets.status')

  const context =
    event.type === 'TRANSFER'
      ? `${event.fromCustodian?.name ?? '—'} → ${event.toCustodian?.name ?? '—'}`
      : event.type === 'STATUS_CHANGE' && event.fromStatus && event.toStatus
        ? `${tStatus(event.fromStatus)} → ${tStatus(event.toStatus)}`
        : null

  return (
    <Link
      href={`/assets/${event.assetId}`}
      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
    >
      <Badge variant={EVENT_VARIANT[event.type]} className="mt-0.5 shrink-0">
        {tEvents(event.type)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {event.asset?.name ?? t('unknownAsset')}
        </p>
        <p className="text-xs text-gray-400">{event.asset?.assetNo}</p>
        {context && <p className="mt-0.5 text-xs text-gray-600">{context}</p>}
        {event.note && <p className="mt-0.5 text-xs text-gray-500">{event.note}</p>}
        <p className="mt-1 text-xs text-gray-400">
          {t('by')} {event.performer?.name ?? t('unknownPerformer')} · {formatDate(event.createdAt)}
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Rewrite the activity page with tabs**

Replace the full contents of `src/app/(main)/activity/page.tsx` with:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, Monitor, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { AssetEventRow, type AssetEventEntry } from '@/components/activity/asset-event-row'

interface TransactionItem {
  id: number
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  note: string | null
  createdAt: string
  item?: {
    id: number
    name: string
    sku: string
  }
  performer?: {
    id: number
    name: string
  }
}

interface ListResponse<T> {
  success: boolean
  data: T[]
  meta?: {
    total: number
    page: number
    limit: number
  }
}

const TYPE_VARIANT: Record<string, 'success' | 'danger' | 'info'> = {
  IN: 'success',
  OUT: 'danger',
  ADJUST: 'info',
}

function TransactionRow({ tx }: { tx: TransactionItem }) {
  const t = useTranslations('activity')
  const tTypes = useTranslations('activity.types')

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <Badge variant={TYPE_VARIANT[tx.type]} className="mt-0.5 shrink-0">
        {tTypes(tx.type)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {tx.item?.name ?? t('unknownItem')}
        </p>
        <p className="text-xs text-gray-400">{tx.item?.sku}</p>
        {tx.note && <p className="mt-0.5 text-xs text-gray-500">{tx.note}</p>}
        <p className="mt-1 text-xs text-gray-400">
          {t('by')} {tx.performer?.name ?? t('unknownPerformer')} · {formatDate(tx.createdAt)}
        </p>
      </div>
      <span
        className={
          tx.type === 'IN'
            ? 'text-sm font-semibold text-green-600'
            : tx.type === 'OUT'
              ? 'text-sm font-semibold text-red-600'
              : 'text-sm font-semibold text-blue-600'
        }
      >
        {tx.type === 'IN' ? '+' : tx.type === 'OUT' ? '-' : '±'}
        {tx.quantity}
      </span>
    </div>
  )
}

type ActivityTab = 'items' | 'assets'

export default function ActivityPage() {
  const t = useTranslations('activity')
  const [tab, setTab] = useState<ActivityTab>('items')

  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [assetEvents, setAssetEvents] = useState<AssetEventEntry[]>([])
  const [assetPage, setAssetPage] = useState(1)
  const [assetHasMore, setAssetHasMore] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetLoadingMore, setAssetLoadingMore] = useState(false)
  const [assetLoaded, setAssetLoaded] = useState(false)

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const res = await apiFetch(`/api/transactions?page=${pageNum}&limit=50`)
      const json: ListResponse<TransactionItem> = await res.json()
      if (json.success) {
        setTransactions((prev) => (append ? [...prev, ...json.data] : json.data))
        const meta = json.meta
        if (meta) {
          setHasMore(meta.page * meta.limit < meta.total)
        }
      }
    } catch (err) {
      console.error('Failed to load transactions:', err)
    }
  }, [])

  const fetchAssetPage = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const res = await apiFetch(`/api/asset-events?page=${pageNum}&limit=50`)
      const json: ListResponse<AssetEventEntry> = await res.json()
      if (json.success) {
        setAssetEvents((prev) => (append ? [...prev, ...json.data] : json.data))
        const meta = json.meta
        if (meta) {
          setAssetHasMore(meta.page * meta.limit < meta.total)
        }
      }
    } catch (err) {
      console.error('Failed to load asset events:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchPage(1, false).finally(() => setLoading(false))
  }, [fetchPage])

  useEffect(() => {
    if (tab !== 'assets' || assetLoaded) return
    setAssetLoaded(true)
    setAssetLoading(true)
    fetchAssetPage(1, false).finally(() => setAssetLoading(false))
  }, [tab, assetLoaded, fetchAssetPage])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setLoadingMore(true)
    await fetchPage(nextPage, true)
    setPage(nextPage)
    setLoadingMore(false)
  }

  const handleAssetLoadMore = async () => {
    const nextPage = assetPage + 1
    setAssetLoadingMore(true)
    await fetchAssetPage(nextPage, true)
    setAssetPage(nextPage)
    setAssetLoadingMore(false)
  }

  const tabs = [
    { key: 'items' as const, icon: Package, label: t('tabItems') },
    { key: 'assets' as const, icon: Monitor, label: t('tabAssets') },
  ]

  return (
    <div className="px-4 py-4">
      <h1 className="mb-3 text-lg font-bold text-gray-900">{t('title')}</h1>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'items' ? (
        loading ? (
          <Loading />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Activity size={40} />}
            title={t('noTransactions')}
            description={t('noTransactionsDesc')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}

            {hasMore && (
              <Button
                variant="secondary"
                className="mt-2 w-full"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t('loadingMore') : t('loadMore')}
              </Button>
            )}
          </div>
        )
      ) : assetLoading ? (
        <Loading />
      ) : assetEvents.length === 0 ? (
        <EmptyState
          icon={<Monitor size={40} />}
          title={t('noAssetEvents')}
          description={t('noAssetEventsDesc')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {assetEvents.map((event) => (
            <AssetEventRow key={event.id} event={event} />
          ))}

          {assetHasMore && (
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={handleAssetLoadMore}
              disabled={assetLoadingMore}
            >
              {assetLoadingMore ? t('loadingMore') : t('loadMore')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify build and lint**

Run: `pnpm lint` — expected: no errors.
Run: `pnpm build` — expected: build succeeds.
Run: `pnpm test` — expected: all tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/activity/asset-event-row.tsx "src/app/(main)/activity/page.tsx" messages/en.json messages/zh-TW.json
git commit -m "feat: add asset events tab to activity page"
```

---

### Task 4: Reports page asset section

**Files:**
- Create: `src/components/reports/stat-card.tsx` (extracted from the page, unchanged markup)
- Create: `src/components/reports/asset-stats.tsx`
- Modify: `src/app/(main)/reports/page.tsx`
- Modify: `messages/en.json` (`reports` namespace)
- Modify: `messages/zh-TW.json` (`reports` namespace)

**Interfaces:**
- Consumes: `GET /api/reports?type=asset-summary` from Task 2 (`AssetSummaryData` shape below matches its `data`); existing `AssetStatusBadge`, `Card*`, `formatCurrency`.
- Produces: `StatCard({ label, value, sub?, highlight? })` in `stat-card.tsx`; `AssetStats({ data: AssetSummaryData })` and exported type `AssetSummaryData` in `asset-stats.tsx`.

- [ ] **Step 1: Add i18n keys**

In `messages/en.json`, `"reports"` namespace — add inside `"stats"` after `"checkedOut": "Checked Out"` (note: add a trailing comma to the previous line):

```json
      "totalAssets": "Total Assets",
      "assetValue": "Asset Value",
      "assetValueSub": "of {total} total",
      "assetsInUse": "In Use",
      "pendingScrap": "Pending Scrap"
```

and at the `"reports"` top level after `"minLabel": "min: {min}"` (add trailing comma to it):

```json
    "assetsTitle": "Assets",
    "byStatus": "By Status"
```

In `messages/zh-TW.json`, same positions:

```json
      "totalAssets": "資產總數",
      "assetValue": "資產價值",
      "assetValueSub": "總購置 {total}",
      "assetsInUse": "使用中",
      "pendingScrap": "待審報廢"
```

```json
    "assetsTitle": "資產",
    "byStatus": "依狀態"
```

- [ ] **Step 2: Extract StatCard into its own component**

Create `src/components/reports/stat-card.tsx` (body copied verbatim from the current page-local component):

```tsx
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export function StatCard({ label, value, sub, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-red-500' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create the AssetStats component**

Create `src/components/reports/asset-stats.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AssetStatusBadge } from '@/components/assets/asset-status-badge'
import { StatCard } from '@/components/reports/stat-card'
import { formatCurrency } from '@/lib/utils'

export interface AssetSummaryData {
  totalAssets: number
  totalValue: number
  activeValue: number
  inUse: number
  pendingScrap: number
  byStatus: Array<{ status: string; count: number }>
}

const ALL_STATUSES = ['idle', 'in_use', 'repair', 'lent_out', 'lost', 'scrapped'] as const

export function AssetStats({ data }: { data: AssetSummaryData }) {
  const t = useTranslations('reports')
  const tStats = useTranslations('reports.stats')

  const countByStatus = Object.fromEntries(data.byStatus.map((row) => [row.status, row.count]))
  const rows = ALL_STATUSES.map((status) => ({ status, count: countByStatus[status] ?? 0 }))
  const maxCount = Math.max(1, ...rows.map((row) => row.count))

  return (
    <>
      <h2 className="text-base font-semibold text-gray-900">{t('assetsTitle')}</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={tStats('totalAssets')} value={data.totalAssets} />
        <StatCard
          label={tStats('assetValue')}
          value={formatCurrency(data.activeValue)}
          sub={tStats('assetValueSub', { total: formatCurrency(data.totalValue) })}
        />
        <StatCard label={tStats('assetsInUse')} value={data.inUse} />
        <StatCard
          label={tStats('pendingScrap')}
          value={data.pendingScrap}
          highlight={data.pendingScrap > 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('byStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.status} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <AssetStatusBadge status={row.status} />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium text-gray-700">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
```

- [ ] **Step 4: Wire the reports page**

In `src/app/(main)/reports/page.tsx`, make these changes:

1. Add imports; remove the local `StatCard` component and its `StatCardProps` interface entirely:

```tsx
import { StatCard } from '@/components/reports/stat-card'
import { AssetStats, type AssetSummaryData } from '@/components/reports/asset-stats'
```

2. Extend the `ReportsData` interface and initial state:

```tsx
interface ReportsData {
  summary: SummaryStats | null
  movements: MovementRow[]
  lowStock: LowStockItem[]
  categories: CategoryBreakdown[]
  assetSummary: AssetSummaryData | null
}
```

```tsx
  const [data, setData] = useState<ReportsData>({
    summary: null,
    movements: [],
    lowStock: [],
    categories: [],
    assetSummary: null,
  })
```

3. Add the fourth fetch to the existing `Promise.all` pair:

```tsx
        const [summaryRes, movementsRes, lowStockRes, assetSummaryRes] = await Promise.all([
          apiFetch('/api/reports?type=summary'),
          apiFetch('/api/reports?type=movements'),
          apiFetch('/api/reports?type=low-stock'),
          apiFetch('/api/reports?type=asset-summary'),
        ])

        const [summaryJson, movementsJson, lowStockJson, assetSummaryJson] = await Promise.all([
          summaryRes.json(),
          movementsRes.json(),
          lowStockRes.json(),
          assetSummaryRes.json(),
        ])
```

and in the `setData` call:

```tsx
          assetSummary: assetSummaryJson.success ? assetSummaryJson.data : null,
```

4. Destructure and render — update the destructuring line and append the section as the LAST child of the page's outer `div` (after the categories `Card`):

```tsx
  const { summary, movements, lowStock, categories, assetSummary } = data
```

```tsx
      {assetSummary && <AssetStats data={assetSummary} />}
```

- [ ] **Step 5: Verify build and lint**

Run: `pnpm lint` — expected: no errors.
Run: `pnpm build` — expected: build succeeds.
Run: `pnpm test` — expected: all tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/reports/stat-card.tsx src/components/reports/asset-stats.tsx "src/app/(main)/reports/page.tsx" messages/en.json messages/zh-TW.json
git commit -m "feat: add asset statistics section to reports page"
```

---

### Task 5: Full verification

**Files:** none created — verification only.

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: green evidence for dev-flow Step 4 gate.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all tests pass, including the 9 new API tests.

- [ ] **Step 2: Lint and production build**

Run: `pnpm lint` — expected: no errors.
Run: `pnpm build` — expected: compiles with `/api/asset-events` listed in the route manifest.

- [ ] **Step 3: Manual browser verification (use the project `verify` skill to launch)**

With `pnpm dev` running and logged in as `admin@pmm.local`:

1. `/activity` — Items tab shows the existing transaction list unchanged.
2. Switch to Assets tab — asset events render newest-first; TRANSFER rows show `from → to` custodians; STATUS_CHANGE rows show localized status transition; rows link to `/assets/{id}`; Load More appears when more than 50 events exist (or verify meta by temporarily requesting `limit=1` in the browser: `/api/asset-events?limit=1`).
3. Empty-state check: if the DB has no asset events, the Assets tab shows the `noAssetEvents` empty state.
4. `/reports` — asset section at the bottom: 4 stat cards (value card shows active value with "of X total" sub-line), by-status list shows all 6 statuses with bars; Pending Scrap card highlighted red when count > 0.
5. Switch language to 中文 via the header switcher — all new strings render in zh-TW on both pages.

- [ ] **Step 4: Report results**

Report the actual command outputs (test counts, build success) back to the main loop for gate acceptance. Do not claim success without green output.
