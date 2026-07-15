import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { db } from '@/db'
import { users, assets, assetEvents } from '@/db/schema'
import { POST } from '@/app/api/assets/route'
import { PUT } from '@/app/api/assets/[id]/route'
import { eq } from 'drizzle-orm'

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

function postRequest(body: object) {
  return new Request('http://localhost/api/assets', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

beforeEach(async () => {
  authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } })
  await db.delete(assetEvents)
  await db.delete(assets)
  await db.delete(users)
  await db.insert(users).values({ id: 1, name: 'Admin', email: 'admin@test.local', passwordHash: 'hash', role: 'admin' })
})

describe('assets API serialNo', () => {
  it('POST persists serialNo', async () => {
    const res = await POST(postRequest({ name: 'Laptop', serialNo: 'SN-ABC-123' }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.serialNo).toBe('SN-ABC-123')
  })

  it('POST without serialNo stores null', async () => {
    const res = await POST(postRequest({ name: 'Laptop' }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.serialNo).toBeNull()
  })

  it('PUT updates serialNo', async () => {
    const created = await (await POST(postRequest({ name: 'Laptop' }))).json()
    const req = new Request(`http://localhost/api/assets/${created.data.id}`, {
      method: 'PUT',
      body: JSON.stringify({ serialNo: 'SN-NEW-999' }),
    }) as unknown as NextRequest
    const res = await PUT(req, { params: Promise.resolve({ id: String(created.data.id) }) })
    const json = await res.json()
    expect(json.success).toBe(true)
    const row = await db.query.assets.findFirst({ where: eq(assets.id, created.data.id) })
    expect(row?.serialNo).toBe('SN-NEW-999')
  })
})
