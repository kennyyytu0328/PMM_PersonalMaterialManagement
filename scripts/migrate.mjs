/**
 * migrate.mjs — Standalone migration runner for Docker.
 * Reads SQL migration files from src/db/migrations/ and applies them
 * to the SQLite database using better-sqlite3 directly (no drizzle-kit needed).
 *
 * Uses a __migrations table to track which migrations have been applied,
 * so it is safe to run multiple times (idempotent).
 */

import Database from 'better-sqlite3'
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Resolve DB path from DATABASE_URL env var or fall back to default
function resolveDbPath() {
  const url = process.env.DATABASE_URL || 'file:/app/data/pmm.db'
  // Strip the "file:" prefix
  return url.replace(/^file:/, '')
}

const dbPath = resolveDbPath()
const dbDir = dirname(dbPath)

// Ensure the data directory exists
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
  console.log(`Created directory: ${dbDir}`)
}

const migrationsDir = join(rootDir, 'src', 'db', 'migrations')

if (!existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`)
  process.exit(1)
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create migrations tracking table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS __migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// Get list of already-applied migrations
const applied = new Set(
  db.prepare('SELECT name FROM __migrations').all().map((r) => r.name)
)

// Collect .sql files in sorted order
const sqlFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

if (sqlFiles.length === 0) {
  console.log('No migration files found. Nothing to apply.')
  db.close()
  process.exit(0)
}

let appliedCount = 0

for (const file of sqlFiles) {
  if (applied.has(file)) {
    console.log(`  [skip] ${file} (already applied)`)
    continue
  }

  const filePath = join(migrationsDir, file)
  const sql = readFileSync(filePath, 'utf8')

  // Drizzle migration files use "--> statement-breakpoint" as a delimiter
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const applyMigration = db.transaction(() => {
    for (const statement of statements) {
      db.exec(statement)
    }
    db.prepare('INSERT INTO __migrations (name) VALUES (?)').run(file)
  })

  applyMigration()
  console.log(`  [ok]   ${file}`)
  appliedCount++
}

db.close()

if (appliedCount === 0) {
  console.log('All migrations already applied. Database is up to date.')
} else {
  console.log(`Applied ${appliedCount} migration(s) successfully.`)
}
