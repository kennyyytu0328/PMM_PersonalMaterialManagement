import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { db } from '@/db'
import { items, assets } from '@/db/schema'
import { GET } from '@/app/api/scan/route'

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

function scanRequest(qs: string) {
  return new Request(`http://localhost/api/scan${qs}`) as unknown as NextRequest
}

beforeEach(async () => {
  authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } })
  await db.delete(items)
  await db.delete(assets)
  await db.insert(items).values({ name: 'Cable', sku: 'SKU-001', barcode: '4710001234567', quantity: 10, unit: 'pcs' })
  await db.insert(assets).values({ assetNo: 'AST-2026-0001', name: 'Laptop', serialNo: 'SN-XYZ-789' })
})

describe('GET /api/scan', () => {
  it('matches item by barcode (regression)', async () => {
    const json = await (await GET(scanRequest('?barcode=4710001234567'))).json()
    expect(json.success).toBe(true)
    expect(json.matchType).toBe('item')
  })

  it('matches asset by assetNo (regression)', async () => {
    const json = await (await GET(scanRequest('?barcode=AST-2026-0001'))).json()
    expect(json.matchType).toBe('asset')
  })

  it('matches asset by serialNo', async () => {
    const json = await (await GET(scanRequest('?barcode=SN-XYZ-789'))).json()
    expect(json.success).toBe(true)
    expect(json.matchType).toBe('asset')
    expect(json.data.serialNo).toBe('SN-XYZ-789')
  })

  it('returns 404 for unknown code', async () => {
    const res = await GET(scanRequest('?barcode=NOPE'))
    expect(res.status).toBe(404)
  })
})
