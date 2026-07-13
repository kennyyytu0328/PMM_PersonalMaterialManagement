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
      activeMissingCost: 0,
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
    // Chair (in_use, null cost) is active with no recorded cost; lost/scrapped null costs don't count
    expect(json.data.activeMissingCost).toBe(1)
    expect(json.data.inUse).toBe(2)
    expect(json.data.pendingScrap).toBe(2)
    const statusMap = Object.fromEntries(
      json.data.byStatus.map((row: { status: string; count: number }) => [row.status, row.count])
    )
    expect(statusMap).toEqual({ idle: 1, in_use: 2, repair: 1, lost: 1, scrapped: 1 })
  })
})
