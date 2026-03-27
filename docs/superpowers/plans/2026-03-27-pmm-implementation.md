# PMM (Personal Material Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app for small teams to manage physical items across warehouse and office environments — with barcode scanning, stock tracking, check-in/check-out, and reports.

**Architecture:** Monolithic Next.js 15 (App Router) with SQLite via Drizzle ORM, NextAuth.js credentials auth, deployed as a single Docker container. Mobile-first bottom-tab navigation with 5 main sections: Dashboard, Items, Scan, Activity, Reports.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, SQLite, Drizzle ORM, NextAuth.js, html5-qrcode, Recharts, Lucide React, Docker

---

## File Map

### Database Layer
- Create: `src/db/schema.ts` — Drizzle schema (all tables)
- Create: `src/db/index.ts` — DB connection singleton
- Create: `drizzle.config.ts` — Drizzle Kit config

### Auth
- Create: `src/lib/auth.ts` — NextAuth config with credentials provider
- Create: `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- Create: `src/middleware.ts` — Route protection middleware

### Validation
- Create: `src/lib/validations.ts` — Zod schemas for all entities

### Utilities
- Create: `src/lib/utils.ts` — cn() helper, SKU generator
- Create: `src/lib/sku.ts` — SKU auto-generation logic

### API Routes
- Create: `src/app/api/items/route.ts` — GET (list), POST (create)
- Create: `src/app/api/items/[id]/route.ts` — GET, PUT, DELETE single item
- Create: `src/app/api/transactions/route.ts` — GET (list), POST (stock in/out/adjust)
- Create: `src/app/api/checkouts/route.ts` — GET (list), POST (check out)
- Create: `src/app/api/checkouts/[id]/return/route.ts` — POST (return item)
- Create: `src/app/api/categories/route.ts` — GET, POST
- Create: `src/app/api/categories/[id]/route.ts` — PUT, DELETE
- Create: `src/app/api/locations/route.ts` — GET, POST
- Create: `src/app/api/locations/[id]/route.ts` — PUT, DELETE
- Create: `src/app/api/scan/route.ts` — GET (barcode lookup)
- Create: `src/app/api/reports/route.ts` — GET (report data)
- Create: `src/app/api/users/route.ts` — GET, POST (admin)
- Create: `src/app/api/users/[id]/route.ts` — PUT, DELETE (admin)

### Layout & Navigation Components
- Create: `src/components/layout/bottom-nav.tsx` — Bottom tab bar
- Create: `src/components/layout/header.tsx` — Top header with search/profile
- Create: `src/components/layout/auth-guard.tsx` — Client-side auth wrapper
- Create: `src/app/(main)/layout.tsx` — Authenticated layout with bottom nav
- Create: `src/app/(auth)/login/page.tsx` — Login page
- Create: `src/app/(auth)/layout.tsx` — Auth layout (no nav)

### UI Components
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/modal.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/loading.tsx`
- Create: `src/components/ui/empty-state.tsx`

### Feature Pages
- Create: `src/app/(main)/dashboard/page.tsx` — Dashboard with stats + activity
- Create: `src/app/(main)/items/page.tsx` — Items list with search/filter
- Create: `src/app/(main)/items/[id]/page.tsx` — Item detail
- Create: `src/app/(main)/items/new/page.tsx` — Add new item form
- Create: `src/app/(main)/scan/page.tsx` — Barcode scanner
- Create: `src/app/(main)/activity/page.tsx` — Transaction history
- Create: `src/app/(main)/reports/page.tsx` — Reports with charts
- Create: `src/app/(main)/admin/categories/page.tsx` — Category management
- Create: `src/app/(main)/admin/locations/page.tsx` — Location management
- Create: `src/app/(main)/admin/users/page.tsx` — User management

### Feature Components
- Create: `src/components/items/item-card.tsx` — Item list card
- Create: `src/components/items/item-form.tsx` — Create/edit item form
- Create: `src/components/items/stock-modal.tsx` — Stock in/out modal
- Create: `src/components/items/checkout-modal.tsx` — Checkout modal
- Create: `src/components/items/item-filters.tsx` — Filter bar
- Create: `src/components/scanner/barcode-scanner.tsx` — Camera scanner wrapper
- Create: `src/components/reports/stat-card.tsx` — Dashboard stat card
- Create: `src/components/reports/stock-chart.tsx` — Stock movement chart
- Create: `src/components/activity/activity-item.tsx` — Activity feed item

### Config & Deployment
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json` (via create-next-app)

### Tests
- Create: `__tests__/lib/sku.test.ts`
- Create: `__tests__/lib/validations.test.ts`
- Create: `__tests__/api/items.test.ts`
- Create: `__tests__/api/transactions.test.ts`
- Create: `__tests__/api/checkouts.test.ts`
- Create: `__tests__/api/auth.test.ts`
- Create: `__tests__/api/scan.test.ts`
- Create: `__tests__/components/barcode-scanner.test.tsx`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `.env.example`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "D:/MyWorkData/WebApp_Tools/Personal_Material_Management"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Select defaults when prompted. This creates the base Next.js 15 project with TypeScript, Tailwind, and App Router.

- [ ] **Step 2: Install core dependencies**

```bash
pnpm add drizzle-orm better-sqlite3 next-auth@beta @auth/drizzle-adapter bcryptjs zod html5-qrcode recharts lucide-react clsx tailwind-merge
pnpm add -D drizzle-kit @types/better-sqlite3 @types/bcryptjs vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create .env.example**

Create `.env.example`:

```env
# Database
DATABASE_URL=file:./data/pmm.db

# Auth
NEXTAUTH_SECRET=generate-a-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 4: Create .env with local values**

```bash
cp .env.example .env
```

Edit `.env` and set `NEXTAUTH_SECRET` to a random string (e.g., output of `openssl rand -base64 32`).

- [ ] **Step 5: Create drizzle.config.ts**

Create `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/pmm.db',
  },
} satisfies Config
```

- [ ] **Step 6: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 7: Add test script to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

- [ ] **Step 8: Create data directory and .gitkeep**

```bash
mkdir -p data
touch data/.gitkeep
echo "data/*.db" >> .gitignore
```

- [ ] **Step 9: Verify project runs**

```bash
pnpm dev
```

Expected: Next.js dev server starts on http://localhost:3000 without errors.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Database Schema & Connection

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Write the failing test for SKU generation**

Create `src/lib/sku.ts` as empty file. Create `__tests__/lib/sku.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateSku } from '@/lib/sku'

describe('generateSku', () => {
  it('generates SKU with PMM prefix and zero-padded number', () => {
    expect(generateSku(1)).toBe('PMM-00001')
    expect(generateSku(42)).toBe('PMM-00042')
    expect(generateSku(99999)).toBe('PMM-99999')
  })

  it('handles numbers beyond 5 digits', () => {
    expect(generateSku(100000)).toBe('PMM-100000')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test __tests__/lib/sku.test.ts
```

Expected: FAIL — `generateSku` is not exported.

- [ ] **Step 3: Implement SKU generation**

Create `src/lib/sku.ts`:

```typescript
export function generateSku(id: number): string {
  return `PMM-${String(id).padStart(5, '0')}`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test __tests__/lib/sku.test.ts
```

Expected: PASS

- [ ] **Step 5: Create utility helpers**

Create `src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
```

- [ ] **Step 6: Create Drizzle schema**

Create `src/db/schema.ts`:

```typescript
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
```

- [ ] **Step 7: Create database connection**

Create `src/db/index.ts`:

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const dbDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, 'pmm.db')
const sqlite = new Database(dbPath)

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
```

- [ ] **Step 8: Generate and run migration**

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: Migration files created in `src/db/migrations/` and applied to `data/pmm.db`.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: add database schema, connection, and SKU generator"
```

---

## Task 3: Validation Schemas

**Files:**
- Create: `src/lib/validations.ts`
- Create: `__tests__/lib/validations.test.ts`

- [ ] **Step 1: Write failing tests for validation schemas**

Create `__tests__/lib/validations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  createItemSchema,
  updateItemSchema,
  createTransactionSchema,
  createCheckoutSchema,
  loginSchema,
  createUserSchema,
  createCategorySchema,
  createLocationSchema,
} from '@/lib/validations'

describe('createItemSchema', () => {
  it('validates a valid item', () => {
    const result = createItemSchema.safeParse({
      name: 'USB-C Cable',
      unit: 'pcs',
      quantity: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createItemSchema.safeParse({
      name: '',
      unit: 'pcs',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = createItemSchema.safeParse({
      name: 'Drill',
      unit: 'pcs',
      description: 'Power drill',
      barcode: '012345678905',
      categoryId: 1,
      locationId: 2,
      quantity: 5,
      minQuantity: 2,
      unitCost: 29.99,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative quantity', () => {
    const result = createItemSchema.safeParse({
      name: 'Cable',
      unit: 'pcs',
      quantity: -1,
    })
    expect(result.success).toBe(false)
  })
})

describe('createTransactionSchema', () => {
  it('validates stock in', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'IN',
      quantity: 5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantity', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'IN',
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'INVALID',
      quantity: 5,
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('validates valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })
})

describe('createCheckoutSchema', () => {
  it('validates a checkout', () => {
    const result = createCheckoutSchema.safeParse({
      itemId: 1,
      userId: 2,
      quantity: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantity', () => {
    const result = createCheckoutSchema.safeParse({
      itemId: 1,
      userId: 2,
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('createUserSchema', () => {
  it('validates a new user', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'securePass123',
      role: 'staff',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short password', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: '123',
      role: 'staff',
    })
    expect(result.success).toBe(false)
  })
})

describe('createCategorySchema', () => {
  it('validates a category', () => {
    const result = createCategorySchema.safeParse({ name: 'Electronics' })
    expect(result.success).toBe(true)
  })
})

describe('createLocationSchema', () => {
  it('validates a location', () => {
    const result = createLocationSchema.safeParse({ name: 'Warehouse A' })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test __tests__/lib/validations.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement validation schemas**

Create `src/lib/validations.ts`:

```typescript
import { z } from 'zod'

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  barcode: z.string().max(100).optional(),
  categoryId: z.number().int().positive().optional(),
  locationId: z.number().int().positive().optional(),
  quantity: z.number().int().min(0).default(0),
  minQuantity: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  unit: z.string().min(1).max(20).default('pcs'),
})

export const updateItemSchema = createItemSchema.partial()

export const createTransactionSchema = z.object({
  itemId: z.number().int().positive(),
  type: z.enum(['IN', 'OUT', 'ADJUST']),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  note: z.string().max(500).optional(),
})

export const createCheckoutSchema = z.object({
  itemId: z.number().int().positive(),
  userId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be greater than 0').default(1),
  dueDate: z.string().optional(),
  note: z.string().max(500).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'staff', 'viewer']).default('staff'),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.number().int().positive().optional(),
})

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/validations.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add Zod validation schemas with tests"
```

---

## Task 4: Authentication

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Write failing test for auth registration**

Create `__tests__/api/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const password = 'securePassword123'
    const hash = await bcrypt.hash(password, 10)

    expect(hash).not.toBe(password)
    expect(await bcrypt.compare(password, hash)).toBe(true)
    expect(await bcrypt.compare('wrongPassword', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
pnpm test __tests__/api/auth.test.ts
```

Expected: PASS (bcryptjs is already installed).

- [ ] **Step 3: Create NextAuth configuration**

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { loginSchema } from './validations'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        })
        if (!user) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

- [ ] **Step 4: Create NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 5: Create registration endpoint**

Create `src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users } from '@/db/schema'
import { createUserSchema } from '@/lib/validations'
import { eq, count } from 'drizzle-orm'
import { generateSku } from '@/lib/sku'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    // First user becomes admin
    const [{ value: userCount }] = await db.select({ value: count() }).from(users)
    const role = userCount === 0 ? 'admin' : parsed.data.role

    const [newUser] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: Create auth types**

Create `src/types/next-auth.d.ts`:

```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'admin' | 'staff' | 'viewer'
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'admin' | 'staff' | 'viewer'
    id: string
  }
}
```

- [ ] **Step 7: Create middleware for route protection**

Create `src/middleware.ts`:

```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin-only routes
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/items/:path*',
    '/scan/:path*',
    '/activity/:path*',
    '/reports/:path*',
    '/admin/:path*',
  ],
}
```

- [ ] **Step 8: Verify auth compiles**

```bash
pnpm build
```

Expected: Build completes without TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: add NextAuth authentication with credentials provider"
```

---

## Task 5: UI Components

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/modal.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/loading.tsx`
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Create Button component**

Create `src/components/ui/button.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800': variant === 'primary',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800': variant === 'danger',
            'text-gray-600 hover:bg-gray-100 active:bg-gray-200': variant === 'ghost',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
```

- [ ] **Step 2: Create Input component**

Create `src/components/ui/input.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
```

- [ ] **Step 3: Create Select component**

Create `src/components/ui/select.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string | number; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, placeholder, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
```

- [ ] **Step 4: Create Card component**

Create `src/components/ui/card.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-gray-200 bg-white p-4 shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-gray-600', className)} {...props} />
}
```

- [ ] **Step 5: Create Badge component**

Create `src/components/ui/badge.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-gray-100 text-gray-700': variant === 'default',
          'bg-green-100 text-green-700': variant === 'success',
          'bg-yellow-100 text-yellow-700': variant === 'warning',
          'bg-red-100 text-red-700': variant === 'danger',
          'bg-blue-100 text-blue-700': variant === 'info',
        },
        className
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 6: Create Modal component**

Create `src/components/ui/modal.tsx`:

```typescript
'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'relative z-50 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl',
          'max-h-[85vh] overflow-y-auto',
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create Toast, Loading, and EmptyState components**

Create `src/components/ui/toast.tsx`:

```typescript
'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  toast: (message: string, type: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 rounded-lg p-3 text-sm font-medium shadow-lg',
              t.type === 'success' && 'bg-green-600 text-white',
              t.type === 'error' && 'bg-red-600 text-white'
            )}
          >
            {t.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
```

Create `src/components/ui/loading.tsx`:

```typescript
export function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      <p className="mt-3 text-sm text-gray-500">{text}</p>
    </div>
  )
}
```

Create `src/components/ui/empty-state.tsx`:

```typescript
import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 text-gray-400">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 8: Verify components compile**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: add shared UI components"
```

---

## Task 6: Layout & Navigation

**Files:**
- Create: `src/components/layout/bottom-nav.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/app/(main)/layout.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx` (redirect to dashboard)

- [ ] **Step 1: Create bottom navigation**

Create `src/components/layout/bottom-nav.tsx`:

```typescript
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Package, Camera, ArrowLeftRight, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/items', label: 'Items', icon: Package },
  { href: '/scan', label: 'Scan', icon: Camera },
  { href: '/activity', label: 'Activity', icon: ArrowLeftRight },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isScan = item.href === '/scan'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center py-2 px-3',
                isScan ? 'relative -top-3' : '',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              {isScan ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                  <item.icon size={24} />
                </div>
              ) : (
                <item.icon size={22} />
              )}
              <span className={cn('text-[10px] mt-1', isScan && 'text-blue-600')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create header**

Create `src/components/layout/header.tsx`:

```typescript
'use client'

import { useSession, signOut } from 'next-auth/react'
import { Search, User, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function Header() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">
          PMM
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/items?search=true" className="text-gray-500 hover:text-gray-700">
            <Search size={20} />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              <User size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500">{session?.user?.role}</p>
                  </div>
                  {session?.user?.role === 'admin' && (
                    <Link
                      href="/admin/users"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings size={16} />
                      Admin Settings
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create authenticated layout**

Create `src/app/(main)/layout.tsx`:

```typescript
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Create auth layout and login page**

Create `src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {children}
    </div>
  )
}
```

Create `src/app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">PMM</h1>
        <p className="mt-1 text-sm text-gray-500">Personal Material Management</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Update root layout with providers**

Create `src/app/providers.tsx`:

```typescript
'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
```

Update `src/app/layout.tsx` — replace the body content:

```typescript
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PMM - Personal Material Management',
  description: 'Track and manage physical items across warehouse and office',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Create root redirect**

Replace `src/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 7: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: add layout, navigation, and login page"
```

---

## Task 7: Items API

**Files:**
- Create: `src/app/api/items/route.ts`
- Create: `src/app/api/items/[id]/route.ts`
- Create: `__tests__/api/items.test.ts`

- [ ] **Step 1: Write failing tests for items API**

Create `__tests__/api/items.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createItemSchema, updateItemSchema } from '@/lib/validations'
import { generateSku } from '@/lib/sku'

describe('Items API validation', () => {
  it('validates item creation with all fields', () => {
    const result = createItemSchema.safeParse({
      name: 'USB-C Cable',
      description: 'Type-C charging cable',
      barcode: '012345678905',
      categoryId: 1,
      locationId: 1,
      quantity: 50,
      minQuantity: 10,
      unitCost: 4.99,
      unit: 'pcs',
    })
    expect(result.success).toBe(true)
  })

  it('validates item creation with minimal fields', () => {
    const result = createItemSchema.safeParse({
      name: 'Tape',
      unit: 'rolls',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(0)
    }
  })

  it('validates partial update', () => {
    const result = updateItemSchema.safeParse({
      name: 'Updated Name',
    })
    expect(result.success).toBe(true)
  })

  it('generates SKU for new items', () => {
    const sku = generateSku(1)
    expect(sku).toBe('PMM-00001')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass** (validation already exists)

```bash
pnpm test __tests__/api/items.test.ts
```

Expected: PASS

- [ ] **Step 3: Create items list/create endpoint**

Create `src/app/api/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { items, categories, locations } from '@/db/schema'
import { createItemSchema } from '@/lib/validations'
import { generateSku } from '@/lib/sku'
import { eq, like, and, lte, desc, count, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const categoryId = searchParams.get('categoryId')
  const locationId = searchParams.get('locationId')
  const lowStock = searchParams.get('lowStock')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const conditions = []
  if (search) {
    conditions.push(
      sql`(${items.name} LIKE ${'%' + search + '%'} OR ${items.sku} LIKE ${'%' + search + '%'} OR ${items.barcode} LIKE ${'%' + search + '%'})`
    )
  }
  if (categoryId) conditions.push(eq(items.categoryId, parseInt(categoryId)))
  if (locationId) conditions.push(eq(items.locationId, parseInt(locationId)))
  if (lowStock === 'true') {
    conditions.push(sql`${items.minQuantity} IS NOT NULL AND ${items.quantity} <= ${items.minQuantity}`)
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [itemList, [{ total }]] = await Promise.all([
    db
      .select()
      .from(items)
      .where(where)
      .orderBy(desc(items.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(items).where(where),
  ])

  return NextResponse.json({
    success: true,
    data: itemList,
    meta: { total, page, limit },
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'viewer') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createItemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const [{ maxId }] = await db
      .select({ maxId: sql<number>`COALESCE(MAX(${items.id}), 0)` })
      .from(items)

    const sku = generateSku(maxId + 1)

    const [newItem] = await db
      .insert(items)
      .values({ ...parsed.data, sku })
      .returning()

    return NextResponse.json({ success: true, data: newItem }, { status: 201 })
  } catch (error) {
    console.error('Create item error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create item' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Create single item endpoint**

Create `src/app/api/items/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { items } from '@/db/schema'
import { updateItemSchema } from '@/lib/validations'
import { eq, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const item = await db.query.items.findFirst({
    where: eq(items.id, parseInt(id)),
  })

  if (!item) {
    return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: item })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'viewer') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateItemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(items)
      .set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
      .where(eq(items.id, parseInt(id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update item error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(items)
    .where(eq(items.id, parseInt(id)))
    .returning()

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add items CRUD API endpoints"
```

---

## Task 8: Transactions & Checkouts API

**Files:**
- Create: `src/app/api/transactions/route.ts`
- Create: `src/app/api/checkouts/route.ts`
- Create: `src/app/api/checkouts/[id]/return/route.ts`
- Create: `src/app/api/scan/route.ts`

- [ ] **Step 1: Write failing test for transaction validation**

Create `__tests__/api/transactions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createTransactionSchema } from '@/lib/validations'

describe('Transaction validation', () => {
  it('validates stock in', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'IN',
      quantity: 10,
      note: 'Received shipment',
    })
    expect(result.success).toBe(true)
  })

  it('validates stock out', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'OUT',
      quantity: 5,
    })
    expect(result.success).toBe(true)
  })

  it('validates adjustment', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'ADJUST',
      quantity: 3,
      note: 'Physical count correction',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative quantity', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'IN',
      quantity: -5,
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test**

```bash
pnpm test __tests__/api/transactions.test.ts
```

Expected: PASS

- [ ] **Step 3: Write failing test for checkout validation**

Create `__tests__/api/checkouts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createCheckoutSchema } from '@/lib/validations'

describe('Checkout validation', () => {
  it('validates a checkout', () => {
    const result = createCheckoutSchema.safeParse({
      itemId: 1,
      userId: 2,
      quantity: 1,
      dueDate: '2026-04-01',
      note: 'For project X',
    })
    expect(result.success).toBe(true)
  })

  it('defaults quantity to 1', () => {
    const result = createCheckoutSchema.safeParse({
      itemId: 1,
      userId: 2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(1)
    }
  })
})
```

- [ ] **Step 4: Run test**

```bash
pnpm test __tests__/api/checkouts.test.ts
```

Expected: PASS

- [ ] **Step 5: Create transactions endpoint**

Create `src/app/api/transactions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { transactions, items } from '@/db/schema'
import { createTransactionSchema } from '@/lib/validations'
import { eq, desc, sql, and } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('itemId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const where = itemId ? eq(transactions.itemId, parseInt(itemId)) : undefined

  const txList = await db
    .select()
    .from(transactions)
    .where(where)
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({ success: true, data: txList })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'viewer') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, parsed.data.itemId),
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    let newQuantity = item.quantity
    if (parsed.data.type === 'IN') {
      newQuantity = item.quantity + parsed.data.quantity
    } else if (parsed.data.type === 'OUT') {
      newQuantity = item.quantity - parsed.data.quantity
      if (newQuantity < 0) {
        return NextResponse.json(
          { success: false, error: 'Insufficient stock' },
          { status: 400 }
        )
      }
    } else if (parsed.data.type === 'ADJUST') {
      newQuantity = parsed.data.quantity
    }

    const [tx] = await db
      .insert(transactions)
      .values({
        ...parsed.data,
        performedBy: parseInt(session.user.id),
      })
      .returning()

    await db
      .update(items)
      .set({ quantity: newQuantity, updatedAt: sql`(datetime('now'))` })
      .where(eq(items.id, parsed.data.itemId))

    return NextResponse.json({ success: true, data: tx }, { status: 201 })
  } catch (error) {
    console.error('Transaction error:', error)
    return NextResponse.json(
      { success: false, error: 'Transaction failed' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: Create checkouts endpoint**

Create `src/app/api/checkouts/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { checkouts, items } from '@/db/schema'
import { createCheckoutSchema } from '@/lib/validations'
import { eq, isNull, desc, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const active = searchParams.get('active')
  const itemId = searchParams.get('itemId')

  let query = db.select().from(checkouts)

  const conditions = []
  if (active === 'true') conditions.push(isNull(checkouts.returnedAt))
  if (itemId) conditions.push(eq(checkouts.itemId, parseInt(itemId)))

  const where = conditions.length > 0 ? sql`${conditions.map((c, i) => i === 0 ? c : sql` AND ${c}`)}` : undefined

  const checkoutList = await db
    .select()
    .from(checkouts)
    .where(conditions.length > 0 ? conditions.reduce((acc, c) => acc ? sql`${acc} AND ${c}` : c) : undefined)
    .orderBy(desc(checkouts.checkedOutAt))

  return NextResponse.json({ success: true, data: checkoutList })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'viewer') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createCheckoutSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const item = await db.query.items.findFirst({
      where: eq(items.id, parsed.data.itemId),
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    if (item.quantity < parsed.data.quantity) {
      return NextResponse.json(
        { success: false, error: 'Insufficient stock for checkout' },
        { status: 400 }
      )
    }

    const [checkout] = await db
      .insert(checkouts)
      .values(parsed.data)
      .returning()

    await db
      .update(items)
      .set({
        quantity: item.quantity - parsed.data.quantity,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(items.id, parsed.data.itemId))

    return NextResponse.json({ success: true, data: checkout }, { status: 201 })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { success: false, error: 'Checkout failed' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 7: Create return endpoint**

Create `src/app/api/checkouts/[id]/return/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { checkouts, items } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'viewer') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const checkout = await db.query.checkouts.findFirst({
    where: eq(checkouts.id, parseInt(id)),
  })

  if (!checkout) {
    return NextResponse.json(
      { success: false, error: 'Checkout not found' },
      { status: 404 }
    )
  }

  if (checkout.returnedAt) {
    return NextResponse.json(
      { success: false, error: 'Already returned' },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(checkouts)
    .set({ returnedAt: sql`(datetime('now'))` })
    .where(eq(checkouts.id, parseInt(id)))
    .returning()

  await db
    .update(items)
    .set({
      quantity: sql`${items.quantity} + ${checkout.quantity}`,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(items.id, checkout.itemId))

  return NextResponse.json({ success: true, data: updated })
}
```

- [ ] **Step 8: Create barcode scan/lookup endpoint**

Create `src/app/api/scan/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { items } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const barcode = searchParams.get('barcode')

  if (!barcode) {
    return NextResponse.json(
      { success: false, error: 'Barcode is required' },
      { status: 400 }
    )
  }

  const item = await db.query.items.findFirst({
    where: eq(items.barcode, barcode),
  })

  if (!item) {
    return NextResponse.json(
      { success: false, error: 'Item not found', barcode },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: item })
}
```

- [ ] **Step 9: Write failing test for scan lookup**

Create `__tests__/api/scan.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('Scan API validation', () => {
  it('requires barcode parameter', () => {
    const url = new URL('http://localhost/api/scan')
    const barcode = url.searchParams.get('barcode')
    expect(barcode).toBeNull()
  })

  it('extracts barcode from URL', () => {
    const url = new URL('http://localhost/api/scan?barcode=012345678905')
    const barcode = url.searchParams.get('barcode')
    expect(barcode).toBe('012345678905')
  })
})
```

- [ ] **Step 10: Run all tests**

```bash
pnpm test
```

Expected: ALL PASS

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: add transactions, checkouts, and scan API endpoints"
```

---

## Task 9: Categories, Locations & Users API

**Files:**
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/api/categories/[id]/route.ts`
- Create: `src/app/api/locations/route.ts`
- Create: `src/app/api/locations/[id]/route.ts`
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`

- [ ] **Step 1: Create categories endpoints**

Create `src/app/api/categories/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { categories } from '@/db/schema'
import { createCategorySchema } from '@/lib/validations'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const categoryList = await db.select().from(categories)
  return NextResponse.json({ success: true, data: categoryList })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const [category] = await db.insert(categories).values(parsed.data).returning()
    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
```

Create `src/app/api/categories/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { categories } from '@/db/schema'
import { createCategorySchema } from '@/lib/validations'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = createCategorySchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(categories)
      .set(parsed.data)
      .where(eq(categories.id, parseInt(id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, parseInt(id)))
    .returning()

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create locations endpoints**

Create `src/app/api/locations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { createLocationSchema } from '@/lib/validations'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const locationList = await db.select().from(locations)
  return NextResponse.json({ success: true, data: locationList })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createLocationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const [location] = await db.insert(locations).values(parsed.data).returning()
    return NextResponse.json({ success: true, data: location }, { status: 201 })
  } catch (error) {
    console.error('Create location error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
```

Create `src/app/api/locations/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { locations } from '@/db/schema'
import { createLocationSchema } from '@/lib/validations'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = createLocationSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(locations)
      .set(parsed.data)
      .where(eq(locations.id, parseInt(id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(locations)
    .where(eq(locations.id, parseInt(id)))
    .returning()

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create users endpoints (admin only)**

Create `src/app/api/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { createUserSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)

  return NextResponse.json({ success: true, data: userList })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    const [newUser] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
```

Create `src/app/api/users/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, role } = body

    const [updated] = await db
      .update(users)
      .set({ ...(name && { name }), ...(role && { role }) })
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })

    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Prevent self-deletion
  if (parseInt(id) === parseInt(session.user.id)) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, parseInt(id)))
    .returning()

  if (!deleted) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add categories, locations, and users API endpoints"
```

---

## Task 10: Reports API

**Files:**
- Create: `src/app/api/reports/route.ts`

- [ ] **Step 1: Create reports endpoint**

Create `src/app/api/reports/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { items, transactions, checkouts, categories, locations } from '@/db/schema'
import { eq, sql, count, sum, isNull, lte, and, gte, desc } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'summary'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (type === 'summary') {
    const [totalItems] = await db.select({ value: count() }).from(items)
    const [totalValue] = await db
      .select({
        value: sql<number>`COALESCE(SUM(${items.quantity} * ${items.unitCost}), 0)`,
      })
      .from(items)
    const [lowStockCount] = await db
      .select({ value: count() })
      .from(items)
      .where(sql`${items.minQuantity} IS NOT NULL AND ${items.quantity} <= ${items.minQuantity}`)
    const [activeCheckouts] = await db
      .select({ value: count() })
      .from(checkouts)
      .where(isNull(checkouts.returnedAt))

    const byCategory = await db
      .select({
        categoryId: items.categoryId,
        categoryName: categories.name,
        count: count(),
        totalQuantity: sum(items.quantity),
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .groupBy(items.categoryId, categories.name)

    const byLocation = await db
      .select({
        locationId: items.locationId,
        locationName: locations.name,
        count: count(),
        totalQuantity: sum(items.quantity),
      })
      .from(items)
      .leftJoin(locations, eq(items.locationId, locations.id))
      .groupBy(items.locationId, locations.name)

    return NextResponse.json({
      success: true,
      data: {
        totalItems: totalItems.value,
        totalValue: totalValue.value,
        lowStockCount: lowStockCount.value,
        activeCheckouts: activeCheckouts.value,
        byCategory,
        byLocation,
      },
    })
  }

  if (type === 'movements') {
    const conditions = []
    if (from) conditions.push(gte(transactions.createdAt, from))
    if (to) conditions.push(lte(transactions.createdAt, to))
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const movements = await db
      .select({
        date: sql<string>`date(${transactions.createdAt})`,
        type: transactions.type,
        total: sum(transactions.quantity),
      })
      .from(transactions)
      .where(where)
      .groupBy(sql`date(${transactions.createdAt})`, transactions.type)
      .orderBy(sql`date(${transactions.createdAt})`)

    return NextResponse.json({ success: true, data: movements })
  }

  if (type === 'low-stock') {
    const lowStockItems = await db
      .select()
      .from(items)
      .where(sql`${items.minQuantity} IS NOT NULL AND ${items.quantity} <= ${items.minQuantity}`)
      .orderBy(sql`${items.quantity} - ${items.minQuantity}`)

    return NextResponse.json({ success: true, data: lowStockItems })
  }

  if (type === 'checkouts') {
    const activeCheckoutList = await db
      .select()
      .from(checkouts)
      .where(isNull(checkouts.returnedAt))
      .orderBy(desc(checkouts.checkedOutAt))

    return NextResponse.json({ success: true, data: activeCheckoutList })
  }

  return NextResponse.json(
    { success: false, error: 'Invalid report type' },
    { status: 400 }
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add reports API endpoint"
```

---

## Task 11: Dashboard Page

**Files:**
- Create: `src/app/(main)/dashboard/page.tsx`
- Create: `src/components/reports/stat-card.tsx`
- Create: `src/components/activity/activity-item.tsx`

- [ ] **Step 1: Create stat card component**

Create `src/components/reports/stat-card.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color: 'blue' | 'yellow' | 'green' | 'purple'
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
        <div className={cn('rounded-lg p-2', colorMap[color])}>
          {icon}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create activity item component**

Create `src/components/activity/activity-item.tsx`:

```typescript
import { ArrowDown, ArrowUp, Settings, ArrowUpRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ActivityItemProps {
  itemName: string
  type: 'IN' | 'OUT' | 'ADJUST' | 'CHECKOUT' | 'RETURN'
  quantity: number
  note?: string
  timestamp: string
  userName?: string
}

const typeConfig = {
  IN: { icon: ArrowDown, color: 'text-green-600', bg: 'bg-green-50', label: 'Stock In', prefix: '+' },
  OUT: { icon: ArrowUp, color: 'text-red-600', bg: 'bg-red-50', label: 'Stock Out', prefix: '-' },
  ADJUST: { icon: Settings, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Adjusted', prefix: '=' },
  CHECKOUT: { icon: ArrowUpRight, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Checked Out', prefix: '-' },
  RETURN: { icon: ArrowDown, color: 'text-green-600', bg: 'bg-green-50', label: 'Returned', prefix: '+' },
}

export function ActivityItem({ itemName, type, quantity, note, timestamp, userName }: ActivityItemProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`rounded-lg p-2 ${config.bg}`}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{itemName}</p>
        <p className="text-xs text-gray-500">
          {config.label}
          {userName && ` by ${userName}`}
          {note && ` — ${note}`}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${config.color}`}>
          {config.prefix}{quantity}
        </p>
        <p className="text-[10px] text-gray-400">{formatDate(timestamp)}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create dashboard page**

Create `src/app/(main)/dashboard/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Package, AlertTriangle, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import { StatCard } from '@/components/reports/stat-card'
import { ActivityItem } from '@/components/activity/activity-item'
import { Loading } from '@/components/ui/loading'
import { formatCurrency } from '@/lib/utils'

interface DashboardData {
  totalItems: number
  totalValue: number
  lowStockCount: number
  activeCheckouts: number
}

interface RecentTransaction {
  id: number
  itemId: number
  type: 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  note: string | null
  createdAt: string
  itemName?: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null)
  const [recent, setRecent] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, activityRes] = await Promise.all([
          fetch('/api/reports?type=summary'),
          fetch('/api/transactions?limit=10'),
        ])

        const summaryData = await summaryRes.json()
        const activityData = await activityRes.json()

        if (summaryData.success) setStats(summaryData.data)
        if (activityData.success) setRecent(activityData.data)
      } catch (error) {
        console.error('Dashboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <Loading text="Loading dashboard..." />

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label="Total Items"
          value={stats?.totalItems ?? 0}
          icon={<Package size={20} />}
          color="blue"
        />
        <StatCard
          label="Low Stock"
          value={stats?.lowStockCount ?? 0}
          icon={<AlertTriangle size={20} />}
          color="yellow"
        />
        <StatCard
          label="Checked Out"
          value={stats?.activeCheckouts ?? 0}
          icon={<ArrowUpRight size={20} />}
          color="green"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(stats?.totalValue ?? 0)}
          icon={<ArrowLeftRight size={20} />}
          color="purple"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent Activity
        </h2>
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm px-4">
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No recent activity</p>
          ) : (
            recent.map((tx) => (
              <ActivityItem
                key={tx.id}
                itemName={tx.itemName || `Item #${tx.itemId}`}
                type={tx.type}
                quantity={tx.quantity}
                note={tx.note || undefined}
                timestamp={tx.createdAt}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add dashboard page with stats and activity feed"
```

---

## Task 12: Items List & Detail Pages

**Files:**
- Create: `src/app/(main)/items/page.tsx`
- Create: `src/app/(main)/items/[id]/page.tsx`
- Create: `src/app/(main)/items/new/page.tsx`
- Create: `src/components/items/item-card.tsx`
- Create: `src/components/items/item-form.tsx`
- Create: `src/components/items/stock-modal.tsx`
- Create: `src/components/items/checkout-modal.tsx`
- Create: `src/components/items/item-filters.tsx`

- [ ] **Step 1: Create item card component**

Create `src/components/items/item-card.tsx`:

```typescript
import Link from 'next/link'
import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Item } from '@/db/schema'

interface ItemCardProps {
  item: Item
}

export function ItemCard({ item }: ItemCardProps) {
  const isLowStock = item.minQuantity !== null && item.quantity <= item.minQuantity

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-3 shadow-sm active:bg-gray-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Package size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500">{item.sku}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">{item.quantity}</p>
        <p className="text-[10px] text-gray-400">{item.unit}</p>
      </div>
      {isLowStock && <Badge variant="warning">Low</Badge>}
    </Link>
  )
}
```

- [ ] **Step 2: Create item filters component**

Create `src/components/items/item-filters.tsx`:

```typescript
'use client'

import { Search, Filter, X } from 'lucide-react'
import { useState } from 'react'

interface ItemFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  categoryId: string
  onCategoryChange: (value: string) => void
  locationId: string
  onLocationChange: (value: string) => void
  lowStock: boolean
  onLowStockChange: (value: boolean) => void
  categories: { id: number; name: string }[]
  locations: { id: number; name: string }[]
}

export function ItemFilters({
  search, onSearchChange,
  categoryId, onCategoryChange,
  locationId, onLocationChange,
  lowStock, onLowStockChange,
  categories, locations,
}: ItemFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-lg border px-3 py-2 ${showFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-500'}`}
        >
          <Filter size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={locationId}
            onChange={(e) => onLocationChange(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
          >
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button
            onClick={() => onLowStockChange(!lowStock)}
            className={`rounded-lg border px-3 py-1.5 text-xs whitespace-nowrap ${lowStock ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-500'}`}
          >
            Low Stock
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create items list page**

Create `src/app/(main)/items/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ItemCard } from '@/components/items/item-card'
import { ItemFilters } from '@/components/items/item-filters'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import type { Item, Category, Location } from '@/db/schema'

export default function ItemsPage() {
  const { data: session } = useSession()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [lowStock, setLowStock] = useState(false)

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoryId) params.set('categoryId', categoryId)
    if (locationId) params.set('locationId', locationId)
    if (lowStock) params.set('lowStock', 'true')

    const res = await fetch(`/api/items?${params}`)
    const data = await res.json()
    if (data.success) setItems(data.data)
  }, [search, categoryId, locationId, lowStock])

  useEffect(() => {
    async function loadFilters() {
      const [catRes, locRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/locations'),
      ])
      const catData = await catRes.json()
      const locData = await locRes.json()
      if (catData.success) setCategories(catData.data)
      if (locData.success) setLocations(locData.data)
    }
    loadFilters()
  }, [])

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      fetchItems().finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchItems])

  const canCreate = session?.user?.role !== 'viewer'

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Items</h1>
        {canCreate && (
          <Link href="/items/new">
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Add
            </Button>
          </Link>
        )}
      </div>

      <ItemFilters
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        locationId={locationId}
        onLocationChange={setLocationId}
        lowStock={lowStock}
        onLowStockChange={setLowStock}
        categories={categories}
        locations={locations}
      />

      <div className="mt-4 space-y-2">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package size={40} />}
            title="No items found"
            description={search ? 'Try a different search term' : 'Add your first item to get started'}
            action={
              canCreate ? (
                <Link href="/items/new">
                  <Button>Add Item</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create stock modal**

Create `src/components/items/stock-modal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface StockModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  itemId: number
  itemName: string
  type: 'IN' | 'OUT'
}

export function StockModal({ open, onClose, onComplete, itemId, itemName, type }: StockModalProps) {
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          type,
          quantity: parseInt(quantity),
          note: note || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast(`Stock ${type === 'IN' ? 'added' : 'removed'} successfully`, 'success')
        setQuantity('')
        setNote('')
        onComplete()
        onClose()
      } else {
        toast(data.error || 'Operation failed', 'error')
      }
    } catch {
      toast('Operation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Stock ${type === 'IN' ? 'In' : 'Out'} — ${itemName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="quantity"
          label="Quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          required
        />
        <Input
          id="note"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Received shipment"
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={type === 'IN' ? 'primary' : 'danger'}
            className="flex-1"
            disabled={loading || !quantity}
          >
            {loading ? 'Processing...' : `Stock ${type === 'IN' ? 'In' : 'Out'}`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 5: Create checkout modal**

Create `src/components/items/checkout-modal.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  itemId: number
  itemName: string
}

interface UserOption {
  id: number
  name: string
}

export function CheckoutModal({ open, onClose, onComplete, itemId, itemName }: CheckoutModalProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [userId, setUserId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetch('/api/users')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setUsers(data.data)
        })
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          userId: parseInt(userId),
          quantity: parseInt(quantity),
          dueDate: dueDate || undefined,
          note: note || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast('Item checked out successfully', 'success')
        setUserId('')
        setQuantity('1')
        setDueDate('')
        setNote('')
        onComplete()
        onClose()
      } else {
        toast(data.error || 'Checkout failed', 'error')
      }
    } catch {
      toast('Checkout failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Check Out — ${itemName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Assign to</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <Input
          id="checkout-quantity"
          label="Quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <Input
          id="due-date"
          label="Due Date (optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Input
          id="checkout-note"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., For project X"
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={loading || !userId}>
            {loading ? 'Processing...' : 'Check Out'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 6: Create item form component**

Create `src/components/items/item-form.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { Item, Category, Location } from '@/db/schema'

interface ItemFormProps {
  item?: Item
  initialBarcode?: string
}

export function ItemForm({ item, initialBarcode }: ItemFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    barcode: item?.barcode || initialBarcode || '',
    categoryId: item?.categoryId?.toString() || '',
    locationId: item?.locationId?.toString() || '',
    quantity: item?.quantity?.toString() || '0',
    minQuantity: item?.minQuantity?.toString() || '',
    unitCost: item?.unitCost?.toString() || '',
    unit: item?.unit || 'pcs',
  })

  useEffect(() => {
    Promise.all([fetch('/api/categories'), fetch('/api/locations')])
      .then(([catRes, locRes]) => Promise.all([catRes.json(), locRes.json()]))
      .then(([catData, locData]) => {
        if (catData.success) setCategories(catData.data)
        if (locData.success) setLocations(locData.data)
      })
  }, [])

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      name: form.name,
      description: form.description || undefined,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      locationId: form.locationId ? parseInt(form.locationId) : undefined,
      quantity: parseInt(form.quantity),
      minQuantity: form.minQuantity ? parseInt(form.minQuantity) : undefined,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
      unit: form.unit,
    }

    try {
      const url = item ? `/api/items/${item.id}` : '/api/items'
      const method = item ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        toast(item ? 'Item updated' : 'Item created', 'success')
        router.push(item ? `/items/${item.id}` : '/items')
        router.refresh()
      } else {
        toast(data.error || 'Failed to save item', 'error')
      }
    } catch {
      toast('Failed to save item', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        label="Name *"
        value={form.name}
        onChange={(e) => updateForm('name', e.target.value)}
        placeholder="e.g., USB-C Cable"
        required
      />
      <Input
        id="description"
        label="Description"
        value={form.description}
        onChange={(e) => updateForm('description', e.target.value)}
        placeholder="Optional description"
      />
      <Input
        id="barcode"
        label="Barcode"
        value={form.barcode}
        onChange={(e) => updateForm('barcode', e.target.value)}
        placeholder="UPC/EAN barcode (optional)"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => updateForm('categoryId', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <select
            value={form.locationId}
            onChange={(e) => updateForm('locationId', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input
          id="quantity"
          label="Quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={(e) => updateForm('quantity', e.target.value)}
        />
        <Input
          id="minQuantity"
          label="Min Qty"
          type="number"
          min="0"
          value={form.minQuantity}
          onChange={(e) => updateForm('minQuantity', e.target.value)}
          placeholder="Alert"
        />
        <Input
          id="unit"
          label="Unit"
          value={form.unit}
          onChange={(e) => updateForm('unit', e.target.value)}
          placeholder="pcs"
        />
      </div>
      <Input
        id="unitCost"
        label="Unit Cost ($)"
        type="number"
        min="0"
        step="0.01"
        value={form.unitCost}
        onChange={(e) => updateForm('unitCost', e.target.value)}
        placeholder="0.00"
      />
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 7: Create new item page**

Create `src/app/(main)/items/new/page.tsx`:

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { ItemForm } from '@/components/items/item-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewItemPage() {
  const searchParams = useSearchParams()
  const barcode = searchParams.get('barcode') || undefined

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/items" className="text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Add New Item</h1>
      </div>
      <ItemForm initialBarcode={barcode} />
    </div>
  )
}
```

- [ ] **Step 8: Create item detail page**

Create `src/app/(main)/items/[id]/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, ArrowDown, ArrowUp, ArrowUpRight, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { StockModal } from '@/components/items/stock-modal'
import { CheckoutModal } from '@/components/items/checkout-modal'
import { ActivityItem } from '@/components/activity/activity-item'
import { useToast } from '@/components/ui/toast'
import { useSession } from 'next-auth/react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Item, Transaction, Checkout } from '@/db/schema'

export default function ItemDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [item, setItem] = useState<Item | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [checkouts, setCheckouts] = useState<Checkout[]>([])
  const [loading, setLoading] = useState(true)
  const [stockModal, setStockModal] = useState<'IN' | 'OUT' | null>(null)
  const [checkoutModal, setCheckoutModal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [itemRes, txRes, coRes] = await Promise.all([
        fetch(`/api/items/${id}`),
        fetch(`/api/transactions?itemId=${id}`),
        fetch(`/api/checkouts?itemId=${id}&active=true`),
      ])

      const [itemData, txData, coData] = await Promise.all([
        itemRes.json(),
        txRes.json(),
        coRes.json(),
      ])

      if (itemData.success) setItem(itemData.data)
      if (txData.success) setTransactions(txData.data)
      if (coData.success) setCheckouts(coData.data)
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this item?')) return

    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
    const data = await res.json()

    if (data.success) {
      toast('Item deleted', 'success')
      router.push('/items')
    } else {
      toast(data.error || 'Delete failed', 'error')
    }
  }

  async function handleReturn(checkoutId: number) {
    const res = await fetch(`/api/checkouts/${checkoutId}/return`, { method: 'POST' })
    const data = await res.json()

    if (data.success) {
      toast('Item returned', 'success')
      loadData()
    } else {
      toast(data.error || 'Return failed', 'error')
    }
  }

  if (loading) return <Loading />
  if (!item) return <p className="p-4 text-center text-gray-500">Item not found</p>

  const canEdit = session?.user?.role !== 'viewer'
  const isAdmin = session?.user?.role === 'admin'
  const isLowStock = item.minQuantity !== null && item.quantity <= item.minQuantity

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/items" className="text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 truncate">{item.name}</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/items/${id}/edit`}>
              <Button size="sm" variant="ghost"><Edit size={16} /></Button>
            </Link>
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={handleDelete}>
                <Trash2 size={16} className="text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-3xl font-bold text-gray-900">{item.quantity}</p>
            <p className="text-sm text-gray-500">{item.unit} in stock</p>
          </div>
          {isLowStock && <Badge variant="warning">Low Stock</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-500">SKU:</span> {item.sku}</div>
          {item.barcode && <div><span className="text-gray-500">Barcode:</span> {item.barcode}</div>}
          {item.unitCost !== null && (
            <div><span className="text-gray-500">Cost:</span> {formatCurrency(item.unitCost)}</div>
          )}
          {item.unitCost !== null && (
            <div><span className="text-gray-500">Value:</span> {formatCurrency(item.quantity * item.unitCost)}</div>
          )}
          {item.description && (
            <div className="col-span-2 text-gray-600 mt-1">{item.description}</div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button size="sm" variant="secondary" onClick={() => setStockModal('IN')}>
            <ArrowDown size={14} className="mr-1" /> Stock In
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setStockModal('OUT')}>
            <ArrowUp size={14} className="mr-1" /> Stock Out
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCheckoutModal(true)}>
            <ArrowUpRight size={14} className="mr-1" /> Check Out
          </Button>
        </div>
      )}

      {/* Active Checkouts */}
      {checkouts.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Active Checkouts</h2>
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-3 space-y-2">
            {checkouts.map((co) => (
              <div key={co.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">User #{co.userId} — {co.quantity} {item.unit}</p>
                  <p className="text-xs text-gray-500">{formatDate(co.checkedOutAt)}</p>
                </div>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => handleReturn(co.id)}>
                    <RotateCcw size={14} className="mr-1" /> Return
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">History</h2>
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm px-4">
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No transactions yet</p>
          ) : (
            transactions.slice(0, 10).map((tx) => (
              <ActivityItem
                key={tx.id}
                itemName={item.name}
                type={tx.type as 'IN' | 'OUT' | 'ADJUST'}
                quantity={tx.quantity}
                note={tx.note || undefined}
                timestamp={tx.createdAt}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {stockModal && (
        <StockModal
          open={!!stockModal}
          onClose={() => setStockModal(null)}
          onComplete={loadData}
          itemId={item.id}
          itemName={item.name}
          type={stockModal}
        />
      )}
      <CheckoutModal
        open={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        onComplete={loadData}
        itemId={item.id}
        itemName={item.name}
      />
    </div>
  )
}
```

- [ ] **Step 9: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: add items list, detail, and create pages with stock/checkout modals"
```

---

## Task 13: Barcode Scanner Page

**Files:**
- Create: `src/components/scanner/barcode-scanner.tsx`
- Create: `src/app/(main)/scan/page.tsx`

- [ ] **Step 1: Write failing test for barcode scanner component**

Create `__tests__/components/barcode-scanner.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('BarcodeScanner', () => {
  it('calls onScan with detected barcode', () => {
    const onScan = vi.fn()
    // Simulate barcode detection
    const barcode = '012345678905'
    onScan(barcode)
    expect(onScan).toHaveBeenCalledWith('012345678905')
  })

  it('calls onError when camera is unavailable', () => {
    const onError = vi.fn()
    const error = 'Camera not available'
    onError(error)
    expect(onError).toHaveBeenCalledWith('Camera not available')
  })
})
```

- [ ] **Step 2: Run test**

```bash
pnpm test __tests__/components/barcode-scanner.test.tsx
```

Expected: PASS

- [ ] **Step 3: Create barcode scanner component**

Create `src/components/scanner/barcode-scanner.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const containerId = 'barcode-scanner'

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          formatsToSupport: [
            0,  // QR_CODE
            1,  // AZTEC
            2,  // CODABAR
            3,  // CODE_39
            4,  // CODE_93
            5,  // CODE_128
            8,  // EAN_8
            9,  // EAN_13
            12, // UPC_A
            13, // UPC_E
          ],
        },
        (decodedText) => {
          onScan(decodedText)
        },
        () => {
          // scan failure — ignore, keep scanning
        }
      )
      .then(() => setScanning(true))
      .catch((err) => {
        onError?.(err.toString())
      })

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan, onError])

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <div id={containerId} className="w-full" />
      {!scanning && (
        <div className="flex h-64 items-center justify-center text-white text-sm">
          Starting camera...
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create scan page**

Create `src/app/(main)/scan/page.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarcodeScanner } from '@/components/scanner/barcode-scanner'
import { Button } from '@/components/ui/button'
import { AlertCircle, Package, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Item } from '@/db/schema'

export default function ScanPage() {
  const router = useRouter()
  const [scannedItem, setScannedItem] = useState<Item | null>(null)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)

  const handleScan = useCallback(async (barcode: string) => {
    setScanning(false)
    setNotFound(null)
    setError(null)

    try {
      const res = await fetch(`/api/scan?barcode=${encodeURIComponent(barcode)}`)
      const data = await res.json()

      if (data.success) {
        setScannedItem(data.data)
      } else {
        setNotFound(barcode)
      }
    } catch {
      setError('Failed to look up barcode')
    }
  }, [])

  function resetScan() {
    setScannedItem(null)
    setNotFound(null)
    setError(null)
    setScanning(true)
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Scan Barcode</h1>

      {scanning && (
        <BarcodeScanner
          onScan={handleScan}
          onError={(err) => setError(err)}
        />
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-center">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm text-red-700">{error}</p>
          <p className="text-xs text-red-500 mt-1">Make sure camera access is allowed</p>
          <Button variant="secondary" className="mt-3" onClick={resetScan}>
            Try Again
          </Button>
        </div>
      )}

      {scannedItem && (
        <div className="mt-4 rounded-xl bg-white border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-green-50 p-2">
              <Package size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{scannedItem.name}</p>
              <p className="text-xs text-gray-500">{scannedItem.sku}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-lg font-bold">{scannedItem.quantity}</p>
              <p className="text-xs text-gray-500">{scannedItem.unit}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => router.push(`/items/${scannedItem.id}`)}
            >
              View Details
            </Button>
            <Button variant="secondary" onClick={resetScan}>
              Scan Again
            </Button>
          </div>
        </div>
      )}

      {notFound && (
        <div className="mt-4 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-center">
          <p className="text-sm text-yellow-800 font-medium">Barcode not found</p>
          <p className="text-xs text-yellow-600 mt-1">Code: {notFound}</p>
          <div className="flex gap-2 mt-3 justify-center">
            <Link href={`/items/new?barcode=${encodeURIComponent(notFound)}`}>
              <Button size="sm">
                <Plus size={14} className="mr-1" /> Add as New Item
              </Button>
            </Link>
            <Button size="sm" variant="secondary" onClick={resetScan}>
              Scan Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add barcode scanner page with camera support"
```

---

## Task 14: Activity & Reports Pages

**Files:**
- Create: `src/app/(main)/activity/page.tsx`
- Create: `src/app/(main)/reports/page.tsx`
- Create: `src/components/reports/stock-chart.tsx`

- [ ] **Step 1: Create activity page**

Create `src/app/(main)/activity/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { ActivityItem } from '@/components/activity/activity-item'
import { Loading } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeftRight } from 'lucide-react'
import type { Transaction } from '@/db/schema'

export default function ActivityPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/transactions?page=${page}&limit=50`)
      const data = await res.json()
      if (data.success) {
        setTransactions((prev) => (page === 1 ? data.data : [...prev, ...data.data]))
      }
      setLoading(false)
    }
    load()
  }, [page])

  if (loading && page === 1) return <Loading text="Loading activity..." />

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Activity</h1>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight size={40} />}
          title="No activity yet"
          description="Stock movements and checkouts will appear here"
        />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm px-4">
          {transactions.map((tx) => (
            <ActivityItem
              key={tx.id}
              itemName={`Item #${tx.itemId}`}
              type={tx.type as 'IN' | 'OUT' | 'ADJUST'}
              quantity={tx.quantity}
              note={tx.note || undefined}
              timestamp={tx.createdAt}
            />
          ))}
        </div>
      )}

      {transactions.length >= page * 50 && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600"
        >
          Load More
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create stock chart component**

Create `src/components/reports/stock-chart.tsx`:

```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface MovementData {
  date: string
  type: 'IN' | 'OUT' | 'ADJUST'
  total: number
}

interface StockChartProps {
  data: MovementData[]
}

export function StockChart({ data }: StockChartProps) {
  // Group by date and pivot types into columns
  const grouped = data.reduce<Record<string, { date: string; IN: number; OUT: number; ADJUST: number }>>(
    (acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date, IN: 0, OUT: 0, ADJUST: 0 }
      }
      acc[item.date][item.type] = Number(item.total)
      return acc
    },
    {}
  )

  const chartData = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No movement data</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="IN" fill="#10b981" name="Stock In" />
        <Bar dataKey="OUT" fill="#ef4444" name="Stock Out" />
        <Bar dataKey="ADJUST" fill="#3b82f6" name="Adjustment" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Create reports page**

Create `src/app/(main)/reports/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { StockChart } from '@/components/reports/stock-chart'
import { StatCard } from '@/components/reports/stat-card'
import { Loading } from '@/components/ui/loading'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, AlertTriangle, ArrowUpRight, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Item } from '@/db/schema'

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, movementsRes, lowStockRes] = await Promise.all([
          fetch('/api/reports?type=summary'),
          fetch('/api/reports?type=movements'),
          fetch('/api/reports?type=low-stock'),
        ])

        const [summaryData, movementsData, lowStockData] = await Promise.all([
          summaryRes.json(),
          movementsRes.json(),
          lowStockRes.json(),
        ])

        if (summaryData.success) setSummary(summaryData.data)
        if (movementsData.success) setMovements(movementsData.data)
        if (lowStockData.success) setLowStockItems(lowStockData.data)
      } catch (error) {
        console.error('Reports load error:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Loading text="Loading reports..." />

  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Reports</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Items"
          value={summary?.totalItems ?? 0}
          icon={<Package size={20} />}
          color="blue"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(summary?.totalValue ?? 0)}
          icon={<DollarSign size={20} />}
          color="purple"
        />
        <StatCard
          label="Low Stock"
          value={summary?.lowStockCount ?? 0}
          icon={<AlertTriangle size={20} />}
          color="yellow"
        />
        <StatCard
          label="Checked Out"
          value={summary?.activeCheckouts ?? 0}
          icon={<ArrowUpRight size={20} />}
          color="green"
        />
      </div>

      {/* Stock Movement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <StockChart data={movements} />
        </CardContent>
      </Card>

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{item.quantity} / {item.minQuantity}</p>
                    <Badge variant="warning">Low</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Category */}
      {summary?.byCategory?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.byCategory.map((cat: any) => (
                <div key={cat.categoryId || 'uncategorized'} className="flex justify-between py-1 text-sm">
                  <span>{cat.categoryName || 'Uncategorized'}</span>
                  <span className="font-medium">{cat.count} items</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add activity and reports pages with stock movement chart"
```

---

## Task 15: Admin Pages

**Files:**
- Create: `src/app/(main)/admin/categories/page.tsx`
- Create: `src/app/(main)/admin/locations/page.tsx`
- Create: `src/app/(main)/admin/users/page.tsx`

- [ ] **Step 1: Create categories admin page**

Create `src/app/(main)/admin/categories/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { Loading } from '@/components/ui/loading'
import type { Category } from '@/db/schema'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { toast } = useToast()

  async function load() {
    const res = await fetch('/api/categories')
    const data = await res.json()
    if (data.success) setCategories(data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditId(null)
    setName('')
    setDescription('')
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditId(cat.id)
    setName(cat.name)
    setDescription(cat.description || '')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/categories/${editId}` : '/api/categories'
    const method = editId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || undefined }),
    })
    const data = await res.json()

    if (data.success) {
      toast(editId ? 'Category updated' : 'Category created', 'success')
      setModalOpen(false)
      load()
    } else {
      toast(data.error || 'Failed', 'error')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category?')) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast('Category deleted', 'success')
      load()
    } else {
      toast(data.error || 'Failed', 'error')
    }
  }

  if (loading) return <Loading />

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500"><ArrowLeft size={20} /></Link>
          <h1 className="text-lg font-bold text-gray-900">Categories</h1>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={16} className="mr-1" /> Add</Button>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-900">{cat.name}</p>
              {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}><Edit size={14} /></Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="cat-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="cat-desc" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" className="w-full">{editId ? 'Update' : 'Create'}</Button>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Create locations admin page**

Create `src/app/(main)/admin/locations/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { Loading } from '@/components/ui/loading'
import type { Location } from '@/db/schema'

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { toast } = useToast()

  async function load() {
    const res = await fetch('/api/locations')
    const data = await res.json()
    if (data.success) setLocations(data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditId(null)
    setName('')
    setDescription('')
    setModalOpen(true)
  }

  function openEdit(loc: Location) {
    setEditId(loc.id)
    setName(loc.name)
    setDescription(loc.description || '')
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editId ? `/api/locations/${editId}` : '/api/locations'
    const method = editId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || undefined }),
    })
    const data = await res.json()

    if (data.success) {
      toast(editId ? 'Location updated' : 'Location created', 'success')
      setModalOpen(false)
      load()
    } else {
      toast(data.error || 'Failed', 'error')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this location?')) return
    const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast('Location deleted', 'success')
      load()
    } else {
      toast(data.error || 'Failed', 'error')
    }
  }

  if (loading) return <Loading />

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500"><ArrowLeft size={20} /></Link>
          <h1 className="text-lg font-bold text-gray-900">Locations</h1>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={16} className="mr-1" /> Add</Button>
      </div>

      <div className="space-y-2">
        {locations.map((loc) => (
          <div key={loc.id} className="flex items-center justify-between rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-900">{loc.name}</p>
              {loc.description && <p className="text-xs text-gray-500">{loc.description}</p>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(loc)}><Edit size={14} /></Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(loc.id)}><Trash2 size={14} className="text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Location' : 'New Location'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="loc-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="loc-desc" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" className="w-full">{editId ? 'Update' : 'Create'}</Button>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: Create users admin page**

Create `src/app/(main)/admin/users/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { Loading } from '@/components/ui/loading'

interface UserDisplay {
  id: number
  name: string
  email: string
  role: 'admin' | 'staff' | 'viewer'
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'staff' | 'viewer'>('staff')
  const { toast } = useToast()

  async function load() {
    const res = await fetch('/api/users')
    const data = await res.json()
    if (data.success) setUsers(data.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })
    const data = await res.json()

    if (data.success) {
      toast('User created', 'success')
      setModalOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      setRole('staff')
      load()
    } else {
      toast(data.error || 'Failed', 'error')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this user?')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast('User deleted', 'success')
      load()
    } else {
      toast(data.error || 'Failed', 'error')
    }
  }

  const roleBadgeVariant = {
    admin: 'danger' as const,
    staff: 'info' as const,
    viewer: 'default' as const,
  }

  if (loading) return <Loading />

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500"><ArrowLeft size={20} /></Link>
          <h1 className="text-lg font-bold text-gray-900">Users</h1>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={16} className="mr-1" /> Add</Button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={roleBadgeVariant[user.role]}>{user.role}</Badge>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(user.id)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="user-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="user-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input id="user-password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" className="w-full">Create User</Button>
        </form>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add admin pages for categories, locations, and users"
```

---

## Task 16: Edit Item Page

**Files:**
- Create: `src/app/(main)/items/[id]/edit/page.tsx`

- [ ] **Step 1: Create edit item page**

Create `src/app/(main)/items/[id]/edit/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ItemForm } from '@/components/items/item-form'
import { Loading } from '@/components/ui/loading'
import type { Item } from '@/db/schema'

export default function EditItemPage() {
  const { id } = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setItem(data.data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <Loading />
  if (!item) return <p className="p-4 text-center text-gray-500">Item not found</p>

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/items/${id}`} className="text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Edit Item</h1>
      </div>
      <ItemForm item={item} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add edit item page"
```

---

## Task 17: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `next.config.ts` (update)

- [ ] **Step 1: Update next.config.ts for standalone output**

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 2: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm db:generate && pnpm build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/src/db/migrations ./src/db/migrations

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 3: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  pmm:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - pmm-data:/app/data
    environment:
      - NEXTAUTH_SECRET=change-this-to-a-random-secret
      - NEXTAUTH_URL=http://localhost:3000
      - DATABASE_URL=file:/app/data/pmm.db
    restart: unless-stopped

volumes:
  pmm-data:
```

- [ ] **Step 4: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
.next
.git
data
.env
.env.local
```

- [ ] **Step 5: Verify Docker build**

```bash
docker build -t pmm .
```

Expected: Image builds successfully.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Docker configuration for deployment"
```

---

## Task 18: Seed Script & Final Verification

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Create seed script**

Create `scripts/seed.ts`:

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import bcrypt from 'bcryptjs'
import * as schema from '../src/db/schema'
import path from 'path'
import fs from 'fs'

const dbDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(path.join(dbDir, 'pmm.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

async function seed() {
  console.log('Seeding database...')

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10)
  const [admin] = db
    .insert(schema.users)
    .values({
      name: 'Admin',
      email: 'admin@pmm.local',
      passwordHash,
      role: 'admin',
    })
    .returning()
    .all()

  console.log(`Created admin user: ${admin.email} (password: admin123)`)

  // Create categories
  const cats = db
    .insert(schema.categories)
    .values([
      { name: 'Electronics', description: 'Electronic components and devices' },
      { name: 'Office Supplies', description: 'General office supplies' },
      { name: 'Tools', description: 'Hand tools and power tools' },
      { name: 'Cables', description: 'Various cables and connectors' },
    ])
    .returning()
    .all()

  console.log(`Created ${cats.length} categories`)

  // Create locations
  const locs = db
    .insert(schema.locations)
    .values([
      { name: 'Warehouse A', description: 'Main warehouse' },
      { name: 'Warehouse B', description: 'Secondary storage' },
      { name: 'Office 201', description: 'Main office' },
      { name: 'Office 202', description: 'Meeting room storage' },
    ])
    .returning()
    .all()

  console.log(`Created ${locs.length} locations`)

  // Create items
  const itemData = [
    { name: 'USB-C Cable', sku: 'PMM-00001', barcode: '012345678905', categoryId: cats[3].id, locationId: locs[0].id, quantity: 50, minQuantity: 10, unitCost: 4.99, unit: 'pcs' },
    { name: 'Whiteboard Marker', sku: 'PMM-00002', categoryId: cats[1].id, locationId: locs[2].id, quantity: 24, minQuantity: 5, unitCost: 1.5, unit: 'pcs' },
    { name: 'Cordless Drill', sku: 'PMM-00003', categoryId: cats[2].id, locationId: locs[0].id, quantity: 3, minQuantity: 1, unitCost: 89.99, unit: 'pcs' },
    { name: 'A4 Paper', sku: 'PMM-00004', categoryId: cats[1].id, locationId: locs[2].id, quantity: 15, minQuantity: 5, unitCost: 6.99, unit: 'reams' },
    { name: 'HDMI Cable', sku: 'PMM-00005', barcode: '098765432101', categoryId: cats[3].id, locationId: locs[0].id, quantity: 30, minQuantity: 5, unitCost: 8.99, unit: 'pcs' },
    { name: 'Wireless Mouse', sku: 'PMM-00006', categoryId: cats[0].id, locationId: locs[2].id, quantity: 8, minQuantity: 3, unitCost: 24.99, unit: 'pcs' },
    { name: 'Screwdriver Set', sku: 'PMM-00007', categoryId: cats[2].id, locationId: locs[0].id, quantity: 5, minQuantity: 2, unitCost: 19.99, unit: 'sets' },
    { name: 'Sticky Notes', sku: 'PMM-00008', categoryId: cats[1].id, locationId: locs[2].id, quantity: 2, minQuantity: 5, unitCost: 3.49, unit: 'packs' },
  ]

  const items = db.insert(schema.items).values(itemData).returning().all()
  console.log(`Created ${items.length} items`)

  // Create some transactions
  const txData = [
    { itemId: items[0].id, type: 'IN' as const, quantity: 50, note: 'Initial stock', performedBy: admin.id },
    { itemId: items[1].id, type: 'IN' as const, quantity: 30, note: 'Initial stock', performedBy: admin.id },
    { itemId: items[1].id, type: 'OUT' as const, quantity: 6, note: 'Office use', performedBy: admin.id },
    { itemId: items[7].id, type: 'IN' as const, quantity: 10, note: 'Restocked', performedBy: admin.id },
    { itemId: items[7].id, type: 'OUT' as const, quantity: 8, note: 'Distributed', performedBy: admin.id },
  ]

  db.insert(schema.transactions).values(txData).run()
  console.log(`Created ${txData.length} transactions`)

  console.log('\nSeed complete!')
  console.log('Login: admin@pmm.local / admin123')
}

seed()
```

- [ ] **Step 2: Add seed script to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "seed": "tsx scripts/seed.ts"
  }
}
```

Install tsx:

```bash
pnpm add -D tsx
```

- [ ] **Step 3: Run seed**

```bash
pnpm db:migrate && pnpm seed
```

Expected: Database seeded with admin user, categories, locations, and sample items.

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: ALL PASS

- [ ] **Step 5: Start dev server and verify manually**

```bash
pnpm dev
```

Open http://localhost:3000, log in with `admin@pmm.local` / `admin123`, verify:
- Dashboard shows stats
- Items list shows seeded items
- Can create new items
- Can stock in/out
- Can scan (requires HTTPS or localhost)
- Admin pages work

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add seed script and finalize project setup"
```

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|-----------------|
| 1 | Project scaffolding | 10 |
| 2 | Database schema & connection | 9 |
| 3 | Validation schemas | 5 |
| 4 | Authentication | 9 |
| 5 | UI components | 9 |
| 6 | Layout & navigation | 8 |
| 7 | Items API | 6 |
| 8 | Transactions & checkouts API | 11 |
| 9 | Categories, locations & users API | 5 |
| 10 | Reports API | 3 |
| 11 | Dashboard page | 5 |
| 12 | Items list & detail pages | 10 |
| 13 | Barcode scanner page | 6 |
| 14 | Activity & reports pages | 5 |
| 15 | Admin pages | 5 |
| 16 | Edit item page | 3 |
| 17 | Docker setup | 6 |
| 18 | Seed & final verification | 6 |
| **Total** | | **121 steps** |
