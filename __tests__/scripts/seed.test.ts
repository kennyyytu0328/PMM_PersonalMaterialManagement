import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'

const dirs: string[] = []

function seedTempDb(extraEnv: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'pmm-seed-'))
  dirs.push(dir)
  const env = { ...process.env, DATABASE_URL: `file:${join(dir, 'test.db')}`, ...extraEnv }
  execFileSync('node', ['scripts/migrate.mjs'], { env })
  execFileSync('node', ['scripts/seed.mjs'], { env })
  return new Database(join(dir, 'test.db'), { readonly: true })
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('seed.mjs env flags', () => {
  it('seeds full sample data by default', () => {
    const db = seedTempDb({})
    expect(db.prepare('SELECT COUNT(*) AS c FROM users').get().c).toBe(1)
    expect(db.prepare('SELECT COUNT(*) AS c FROM items').get().c).toBe(8)
    expect(db.prepare('SELECT COUNT(*) AS c FROM categories').get().c).toBe(4)
    db.close()
  })

  it('seeds only the admin user when SEED_SAMPLE_DATA=false', () => {
    const db = seedTempDb({ SEED_SAMPLE_DATA: 'false' })
    expect(db.prepare('SELECT COUNT(*) AS c FROM users').get().c).toBe(1)
    expect(db.prepare('SELECT COUNT(*) AS c FROM items').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM categories').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM locations').get().c).toBe(0)
    expect(db.prepare('SELECT COUNT(*) AS c FROM transactions').get().c).toBe(0)
    db.close()
  })

  it('hashes ADMIN_INITIAL_PASSWORD into the admin user', () => {
    const db = seedTempDb({ SEED_SAMPLE_DATA: 'false', ADMIN_INITIAL_PASSWORD: 'S3cure!Pass' })
    const admin = db.prepare("SELECT password_hash FROM users WHERE email = 'admin@pmm.local'").get()
    expect(bcrypt.compareSync('S3cure!Pass', admin.password_hash)).toBe(true)
    expect(bcrypt.compareSync('admin123', admin.password_hash)).toBe(false)
    db.close()
  })
})
