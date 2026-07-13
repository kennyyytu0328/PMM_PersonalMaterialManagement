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
