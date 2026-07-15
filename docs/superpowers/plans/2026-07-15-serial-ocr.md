# Serial-Number OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assets get a `serialNo` field, lookable-up from the scan page and fillable via on-device OCR (tesseract.js) at registration.

**Architecture:** A nullable `serial_no` column on `assets` flows through the existing Zod→spread-insert API path (mirroring the `barcode` field exactly). A pluggable OCR module (`src/lib/ocr.ts`) wraps a lazily-created tesseract.js worker with self-hosted WASM/traineddata assets. A single-shot camera capture component (`serial-ocr-scanner.tsx`) feeds confirmed text either to the scan page's existing lookup or into the asset form.

**Tech Stack:** Next.js 16 (App Router, `output: 'standalone'`, optional `basePath`), TypeScript strict, Drizzle ORM + better-sqlite3, Zod 4, next-intl, Tailwind 4, tesseract.js ^6 (new dep), Vitest 4 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-15-serial-ocr-design.md`

## Global Constraints

- Immutability everywhere: new objects via spread, never mutate (project rule).
- All user-visible strings in BOTH `messages/en.json` and `messages/zh-TW.json`; keys per namespace noted in each task.
- API response shape: `{ success: boolean, data?: T, error?: string }`.
- `serialNo` mirrors the existing `barcode` optional-field pattern through form → Zod → API → DB (empty form value is omitted the same way barcode is; no unique constraint, no index — the schema declares uniqueness only via `.unique()` and this column is not unique).
- Every static OCR asset URL must be basePath-aware: prefix with `process.env.NEXT_PUBLIC_BASE_PATH ?? ''` read as the FULL expression (never destructured) — same as `src/lib/api.ts`.
- No `console.log` in committed code. Files < 400 lines.
- Run commands with `pnpm` from the repo root. Tests: `npx vitest run <file>`.
- Commit after each task; message format `<type>: <description>`.

---

### Task 1: Schema, migration, and validation for `assets.serialNo`

**Files:**
- Modify: `src/db/schema.ts` (assets table, after the `barcode` line ~91)
- Modify: `src/lib/validations.ts:65-78` (`createAssetSchema`)
- Create: `src/db/migrations/<generated>.sql` (via `pnpm db:generate`)
- Test: `__tests__/lib/asset-validations.test.ts` (extend existing file)

**Interfaces:**
- Consumes: existing `createAssetSchema` / `updateAssetSchema = createAssetSchema.partial()`.
- Produces: `assets.serialNo` column (`serial_no` TEXT, nullable); `createAssetSchema` accepts optional `serialNo: string (max 120)`. Drizzle types `Asset`/`NewAsset` pick the field up automatically via `$inferSelect`/`$inferInsert`.

- [ ] **Step 1: Write the failing tests** — append to `__tests__/lib/asset-validations.test.ts`:

```ts
describe('createAssetSchema serialNo', () => {
  it('accepts a valid serial number', () => {
    const result = createAssetSchema.safeParse({ name: 'Laptop', serialNo: 'SN-2026-00042' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.serialNo).toBe('SN-2026-00042')
  })

  it('accepts payload without serialNo', () => {
    const result = createAssetSchema.safeParse({ name: 'Laptop' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.serialNo).toBeUndefined()
  })

  it('rejects serialNo longer than 120 chars', () => {
    const result = createAssetSchema.safeParse({ name: 'Laptop', serialNo: 'X'.repeat(121) })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run __tests__/lib/asset-validations.test.ts`
Expected: FAIL — first test fails because Zod strips/never returns `serialNo` (`toBe('SN-2026-00042')` gets `undefined`).

- [ ] **Step 3: Implement** — in `src/db/schema.ts` assets table add after `barcode: text('barcode'),`:

```ts
  serialNo: text('serial_no'),
```

In `src/lib/validations.ts` `createAssetSchema`, add after `barcode: ...`:

```ts
  serialNo: z.string().max(120).optional(),
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run __tests__/lib/asset-validations.test.ts`
Expected: PASS (all, including pre-existing cases).

- [ ] **Step 5: Generate + apply migration**

Run: `pnpm db:generate` then `pnpm db:migrate`
Expected: a new file in `src/db/migrations/` containing `ALTER TABLE \`assets\` ADD \`serial_no\` text;`, and migrate exits cleanly. The full API test suite (in-memory DB runs real migrations) must still pass: `npx vitest run __tests__/api/`.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/lib/validations.ts src/db/migrations __tests__/lib/asset-validations.test.ts
git commit -m "feat: add serialNo column and validation to assets"
```

---

### Task 2: Assets API round-trips `serialNo`

**Files:**
- Modify: none expected — `src/app/api/assets/route.ts` POST spreads `parsed.data` and `src/app/api/assets/[id]/route.ts` PUT spreads `parsed.data`, so Task 1's Zod change should already flow through. This task PROVES it with tests (and fixes the routes only if a test fails).
- Test: Create `__tests__/api/assets-serial.test.ts`

**Interfaces:**
- Consumes: `assets.serialNo` (Task 1); POST `/api/assets`, PUT `/api/assets/[id]`.
- Produces: guaranteed behavior later tasks rely on: create/update persist `serialNo`; omitted field stores NULL.

- [ ] **Step 1: Write the failing/proving test** — create `__tests__/api/assets-serial.test.ts`, copying the exact mock pattern from `__tests__/api/asset-events.test.ts` (vi.hoisted auth mock + in-memory DB with real migrations):

```ts
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
```

Note: if the real PUT handler's second argument or POST response shape differs (read the actual route files first), adapt the test calls to the real signatures — the assertions on `serialNo` stay as written.

- [ ] **Step 2: Run the test**

Run: `npx vitest run __tests__/api/assets-serial.test.ts`
Expected: PASS immediately (spread pattern). If any assertion fails, fix the route to include `serialNo` from `parsed.data` and re-run until PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/api/assets-serial.test.ts
git commit -m "test: prove assets API round-trips serialNo"
```

---

### Task 3: Scan lookup matches `serialNo`

**Files:**
- Modify: `src/app/api/scan/route.ts:48`
- Test: Create `__tests__/api/scan.test.ts`

**Interfaces:**
- Consumes: `GET /api/scan?barcode=<code>`; `assets.serialNo` (Task 1).
- Produces: scan lookup resolves assets by `barcode OR assetNo OR serialNo`; response `{ success: true, matchType: 'asset', data }` unchanged in shape.

- [ ] **Step 1: Write the failing test** — create `__tests__/api/scan.test.ts` with the same `vi.mock('@/db', ...)` + `authMock` boilerplate as Task 2 (copy verbatim), importing `GET` from `@/app/api/scan/route` and seeding `items` and `assets`:

```ts
import { items } from '@/db/schema'
import { GET } from '@/app/api/scan/route'

function scanRequest(qs: string) {
  return new Request(`http://localhost/api/scan${qs}`) as unknown as NextRequest
}

describe('GET /api/scan', () => {
  beforeEach(async () => {
    await db.delete(items)
    await db.insert(items).values({ name: 'Cable', sku: 'SKU-001', barcode: '4710001234567', quantity: 10, unit: 'pcs' })
    await db.insert(assets).values({ assetNo: 'AST-2026-0001', name: 'Laptop', serialNo: 'SN-XYZ-789' })
  })

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
```

(Adjust the `items` seed columns to the real `items` schema — read `src/db/schema.ts` items table first; required NOT NULL columns must be provided.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run __tests__/api/scan.test.ts`
Expected: FAIL only on "matches asset by serialNo" (404); regressions PASS.

- [ ] **Step 3: Implement** — in `src/app/api/scan/route.ts`, change the asset where-clause:

```ts
        where: or(eq(assets.barcode, code), eq(assets.assetNo, code), eq(assets.serialNo, code)),
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run __tests__/api/scan.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/scan/route.ts __tests__/api/scan.test.ts
git commit -m "feat: scan lookup matches assets by serial number"
```

---

### Task 4: Serial field in AssetForm, asset detail row, /assets/new query param

**Files:**
- Modify: `src/components/assets/asset-form.tsx` (AssetFormData, defaultFormData, one Input after the barcode field)
- Modify: `src/app/(main)/assets/new/page.tsx` (read `serialNo` searchParam)
- Modify: `src/app/(main)/assets/[id]/edit/page.tsx` (initialData mapping)
- Modify: `src/app/(main)/assets/[id]/page.tsx` (infoRows)
- Modify: `messages/en.json`, `messages/zh-TW.json`
- Test: Create `__tests__/components/asset-form-serial.test.tsx` (first component test in the repo)

**Interfaces:**
- Consumes: `createAssetSchema.serialNo` (Task 1); assets API (Task 2).
- Produces: `AssetFormData` gains `serialNo: string` (form-level empty string, omitted from payload exactly as `barcode` is); `/assets/new?serialNo=<text>` pre-fills the field — Task 7 links to it, Task 8 adds the OCR button beside it.

- [ ] **Step 1: Write the failing component test** — create `__tests__/components/asset-form-serial.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import en from '../../messages/en.json'
import { AssetForm } from '@/components/assets/asset-form'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, data: [] }),
  })),
}))

function renderForm(initialData?: Record<string, string>) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AssetForm initialData={initialData} />
    </NextIntlClientProvider>
  )
}

describe('AssetForm serial number field', () => {
  it('renders an editable serial number input', async () => {
    renderForm()
    const input = await screen.findByLabelText(en.assetForm.serialNoLabel)
    await userEvent.type(input, 'SN-123')
    expect(input).toHaveValue('SN-123')
  })

  it('pre-fills from initialData', async () => {
    renderForm({ serialNo: 'SN-FROM-OCR' })
    expect(await screen.findByLabelText(en.assetForm.serialNoLabel)).toHaveValue('SN-FROM-OCR')
  })
})
```

Notes for the implementer: check `asset-form.tsx` imports first — if the component consumes additional contexts (e.g. a Toast provider), wrap the render with that provider too. `@testing-library/user-event` may need `pnpm add -D @testing-library/user-event` if absent from package.json.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run __tests__/components/asset-form-serial.test.tsx`
Expected: FAIL — `en.assetForm.serialNoLabel` is undefined / input not found.

- [ ] **Step 3: Implement**

3a. `messages/en.json` `assetForm` namespace, after `"barcodePlaceholder"`:

```json
    "serialNoLabel": "Serial No.",
    "serialNoPlaceholder": "Device serial number (optional)",
```

`messages/zh-TW.json` same position:

```json
    "serialNoLabel": "序號",
    "serialNoPlaceholder": "設備序號（選填）",
```

3b. `asset-form.tsx`: add `serialNo: string` to `AssetFormData`, `serialNo: ''` to `defaultFormData`, and after the barcode `<Input>`:

```tsx
<Input
  id="serial-no"
  label={t('serialNoLabel')}
  type="text"
  value={form.serialNo}
  onChange={(e) => handleChange('serialNo', e.target.value)}
  placeholder={t('serialNoPlaceholder')}
/>
```

Then find where the submit payload is built and include `serialNo` exactly the way `barcode` is included (same empty-value omission logic — read the existing submit handler and mirror it).

3c. `src/app/(main)/assets/new/page.tsx` — make it async and read the param (switch `useTranslations` → `getTranslations` since the component becomes async):

```tsx
import { getTranslations } from 'next-intl/server'
import { AssetForm } from '@/components/assets/asset-form'

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ serialNo?: string }>
}) {
  const t = await getTranslations('assetForm')
  const { serialNo } = await searchParams
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('createTitle')}</h1>
      <AssetForm initialData={serialNo ? { serialNo } : undefined} />
    </div>
  )
}
```

3d. `src/app/(main)/assets/[id]/edit/page.tsx` — in the response→AssetFormData mapping add `serialNo: asset.serialNo ?? ''`.

3e. `src/app/(main)/assets/[id]/page.tsx` — in `infoRows`, after the assetNo row (find the namespace used by the page's `useTranslations` call — likely `assetDetail` — and add key `"serialNo": "Serial No."` / `"serialNo": "序號"` to both message files in that namespace):

```ts
  ...(asset.serialNo ? ([[t('serialNo'), asset.serialNo]] as Array<[string, string]>) : []),
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run __tests__/components/asset-form-serial.test.tsx` — Expected: PASS.
Then full suite regression: `npx vitest run` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/assets/asset-form.tsx "src/app/(main)/assets" messages __tests__/components/asset-form-serial.test.tsx package.json pnpm-lock.yaml
git commit -m "feat: serial number field on asset form and detail page"
```

---

### Task 5: OCR engine module with self-hosted tesseract.js assets

**Files:**
- Create: `src/lib/ocr.ts`
- Create: `scripts/copy-ocr-assets.mjs`
- Create: `public/ocr/lang/eng.traineddata.gz` (downloaded once, committed)
- Modify: `package.json` (dep + `postinstall` script), `.gitignore`
- Test: Create `__tests__/lib/ocr.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by Task 6):
  - `normalizeSerial(raw: string): string` — uppercase, strip all whitespace, keep only `A-Z0-9-`.
  - `recognizeSerial(image: Blob | HTMLCanvasElement): Promise<{ text: string; confidence: number }>` — normalized text; confidence 0-100.
  - `disposeOcr(): Promise<void>` — terminates the shared worker.

- [ ] **Step 1: Install dependency**

Run: `pnpm add tesseract.js`
Expected: `tesseract.js ^6.x` in dependencies.

- [ ] **Step 2: Write the failing tests** — create `__tests__/lib/ocr.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const recognizeMock = vi.hoisted(() => vi.fn())
const setParametersMock = vi.hoisted(() => vi.fn())
const terminateMock = vi.hoisted(() => vi.fn())
const createWorkerMock = vi.hoisted(() =>
  vi.fn(async () => ({
    recognize: recognizeMock,
    setParameters: setParametersMock,
    terminate: terminateMock,
  }))
)
vi.mock('tesseract.js', () => ({
  createWorker: createWorkerMock,
  PSM: { SINGLE_LINE: '7' },
}))

import { normalizeSerial, recognizeSerial, disposeOcr } from '@/lib/ocr'

describe('normalizeSerial', () => {
  it('uppercases and strips whitespace', () => {
    expect(normalizeSerial(' sn 123-a b ')).toBe('SN123-AB')
  })
  it('drops characters outside A-Z0-9-', () => {
    expect(normalizeSerial('SN_12.3/4#')).toBe('SN1234')
  })
  it('returns empty string for unreadable input', () => {
    expect(normalizeSerial(' \n .. ')).toBe('')
  })
})

describe('recognizeSerial', () => {
  beforeEach(async () => {
    await disposeOcr()
    vi.clearAllMocks()
    recognizeMock.mockResolvedValue({ data: { text: ' sn-42 x\n', confidence: 87 } })
  })

  it('returns normalized text and confidence', async () => {
    const result = await recognizeSerial(new Blob())
    expect(result).toEqual({ text: 'SN-42X', confidence: 87 })
  })

  it('reuses one worker across calls', async () => {
    await recognizeSerial(new Blob())
    await recognizeSerial(new Blob())
    expect(createWorkerMock).toHaveBeenCalledTimes(1)
  })

  it('disposeOcr terminates and allows recreation', async () => {
    await recognizeSerial(new Blob())
    await disposeOcr()
    expect(terminateMock).toHaveBeenCalledTimes(1)
    await recognizeSerial(new Blob())
    expect(createWorkerMock).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run __tests__/lib/ocr.test.ts`
Expected: FAIL — `@/lib/ocr` does not exist.

- [ ] **Step 4: Implement** — create `src/lib/ocr.ts`:

```ts
import { createWorker, PSM, type Worker } from 'tesseract.js'

// Next.js only inlines the full expression — do not destructure (see src/lib/api.ts).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export interface SerialOcrResult {
  text: string
  confidence: number
}

export function normalizeSerial(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
}

let workerPromise: Promise<Worker> | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        workerPath: `${BASE_PATH}/ocr/worker.min.js`,
        corePath: `${BASE_PATH}/ocr/core`,
        langPath: `${BASE_PATH}/ocr/lang`,
      })
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
      })
      return worker
    })()
  }
  return workerPromise
}

export async function recognizeSerial(image: Blob | HTMLCanvasElement): Promise<SerialOcrResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(image)
  return { text: normalizeSerial(data.text), confidence: data.confidence }
}

export async function disposeOcr(): Promise<void> {
  if (!workerPromise) return
  const pending = workerPromise
  workerPromise = null
  const worker = await pending
  await worker.terminate()
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run __tests__/lib/ocr.test.ts`
Expected: PASS (6/6).

- [ ] **Step 6: Self-hosted engine assets** — create `scripts/copy-ocr-assets.mjs`:

```js
// Copies tesseract.js runtime assets from node_modules into public/ocr so the
// app works with no CDN access (LAN-only deployments). Runs on postinstall.
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'ocr')

mkdirSync(join(out, 'core'), { recursive: true })

cpSync(join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), join(out, 'worker.min.js'))

const coreFiles = [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
]
for (const f of coreFiles) {
  const src = join(root, 'node_modules', 'tesseract.js-core', f)
  if (existsSync(src)) cpSync(src, join(out, 'core', f))
}
```

In `package.json` scripts add:

```json
    "postinstall": "node scripts/copy-ocr-assets.mjs",
```

In `.gitignore` add (generated from node_modules; the committed traineddata stays):

```
/public/ocr/worker.min.js
/public/ocr/core/
```

Download the language model once and commit it:

Run: `curl -L -o public/ocr/lang/eng.traineddata.gz https://tessdata.projectnaptha.com/4.0.0_fast/eng.traineddata.gz`
Then run: `node scripts/copy-ocr-assets.mjs` and verify `public/ocr/worker.min.js` and 4 files in `public/ocr/core/` exist.

- [ ] **Step 7: Full regression + commit**

Run: `npx vitest run` — Expected: PASS.

```bash
git add src/lib/ocr.ts scripts/copy-ocr-assets.mjs public/ocr/lang/eng.traineddata.gz package.json pnpm-lock.yaml .gitignore __tests__/lib/ocr.test.ts
git commit -m "feat: pluggable serial OCR engine with self-hosted tesseract.js assets"
```

---

### Task 6: SerialOcrScanner capture component

**Files:**
- Create: `src/components/scanner/serial-ocr-scanner.tsx`
- Modify: `messages/en.json`, `messages/zh-TW.json` (`scan` namespace)
- Test: Create `__tests__/components/serial-ocr-scanner.test.tsx`

**Interfaces:**
- Consumes: `recognizeSerial`, `disposeOcr` from `@/lib/ocr` (Task 5); `Button` from `@/components/ui/button`; `Input` from `@/components/ui/input`; translation namespace `scan`.
- Produces (used by Tasks 7-8): `export function SerialOcrScanner({ onDetected }: { onDetected: (text: string) => void })` — renders camera preview + capture; calls `onDetected` with the USER-CONFIRMED string; never performs lookup itself.

Component states: `'ready' | 'recognizing' | 'result' | 'empty'` plus camera error states identical in taxonomy to `barcode-scanner.tsx` (`denied` / `notFound` / `insecure` / `generic`, retry via remount key).

- [ ] **Step 1: Add i18n keys** — `messages/en.json` `scan` namespace, after `"retryCamera"`:

```json
    "modeBarcode": "Barcode",
    "modeSerial": "Serial No.",
    "capture": "Capture",
    "recognizing": "Recognizing...",
    "recognizedLabel": "Recognized serial number",
    "confidenceHint": "Confidence {value}%",
    "nothingReadable": "No readable text — try again with the serial inside the frame",
    "useSerial": "Look up",
    "retake": "Retake",
    "serialGuideHint": "Align the serial number inside the frame",
    "addAsNewAsset": "Register as New Asset"
```

`messages/zh-TW.json` same position:

```json
    "modeBarcode": "條碼",
    "modeSerial": "序號",
    "capture": "拍攝",
    "recognizing": "辨識中...",
    "recognizedLabel": "辨識出的序號",
    "confidenceHint": "信心度 {value}%",
    "nothingReadable": "未辨識到文字 — 請將序號對準框內再試一次",
    "useSerial": "查詢",
    "retake": "重拍",
    "serialGuideHint": "將序號對準框內",
    "addAsNewAsset": "登記為新資產"
```

- [ ] **Step 2: Write the failing component test** — create `__tests__/components/serial-ocr-scanner.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import en from '../../messages/en.json'
import { SerialOcrScanner } from '@/components/scanner/serial-ocr-scanner'

const recognizeSerialMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/ocr', () => ({
  recognizeSerial: recognizeSerialMock,
  disposeOcr: vi.fn(async () => {}),
}))

beforeEach(() => {
  vi.clearAllMocks()
  recognizeSerialMock.mockResolvedValue({ text: 'SN-OCR-77', confidence: 91 })
  // jsdom has no camera or canvas — stub both.
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
      })),
    },
  })
  window.HTMLMediaElement.prototype.play = vi.fn(async () => {})
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    filter: '',
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext
})

function renderScanner(onDetected = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SerialOcrScanner onDetected={onDetected} />
    </NextIntlClientProvider>
  )
  return onDetected
}

describe('SerialOcrScanner', () => {
  it('captures, shows editable result, and confirms user-edited text', async () => {
    const onDetected = renderScanner()
    await userEvent.click(await screen.findByRole('button', { name: en.scan.capture }))
    const input = await screen.findByLabelText(en.scan.recognizedLabel)
    expect(input).toHaveValue('SN-OCR-77')
    await userEvent.clear(input)
    await userEvent.type(input, 'SN-EDITED')
    await userEvent.click(screen.getByRole('button', { name: en.scan.useSerial }))
    expect(onDetected).toHaveBeenCalledWith('SN-EDITED')
  })

  it('shows retry state when nothing is recognized', async () => {
    recognizeSerialMock.mockResolvedValue({ text: '', confidence: 0 })
    renderScanner()
    await userEvent.click(await screen.findByRole('button', { name: en.scan.capture }))
    expect(await screen.findByText(en.scan.nothingReadable)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.scan.retake })).toBeInTheDocument()
  })

  it('shows camera error state when getUserMedia rejects', async () => {
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DOMException('denied', 'NotAllowedError')
    )
    renderScanner()
    expect(await screen.findByText(en.scan.cameraError.denied)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run __tests__/components/serial-ocr-scanner.test.tsx`
Expected: FAIL — module `@/components/scanner/serial-ocr-scanner` does not exist.

- [ ] **Step 4: Implement** — create `src/components/scanner/serial-ocr-scanner.tsx` (client component). Requirements the code must satisfy — follow `barcode-scanner.tsx` for style and camera error mapping (copy its `mapCameraError` helper):

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { recognizeSerial, disposeOcr } from '@/lib/ocr'

interface SerialOcrScannerProps {
  onDetected: (text: string) => void
}

type CameraError = 'denied' | 'notFound' | 'insecure' | 'generic'
type OcrState = 'ready' | 'recognizing' | 'result' | 'empty'

function mapCameraError(err: unknown): CameraError {
  const name =
    err instanceof DOMException
      ? err.name
      : typeof err === 'string'
        ? err
        : ((err as { name?: string })?.name ?? '')
  if (/NotAllowed|Permission|Security/i.test(name)) return 'denied'
  if (/NotFound|DevicesNotFound|Overconstrained/i.test(name)) return 'notFound'
  return 'generic'
}

export function SerialOcrScanner({ onDetected }: SerialOcrScannerProps) {
  const t = useTranslations('scan')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<CameraError | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [state, setState] = useState<OcrState>('ready')
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState(0)

  useEffect(() => {
    let mounted = true
    setError(null)

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (mounted) setError('insecure')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        if (mounted) setError(mapCameraError(err))
      }
    }

    startCamera()

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      disposeOcr().catch(() => {
        // ignore cleanup errors
      })
    }
  }, [retryKey])

  async function handleCapture() {
    const video = videoRef.current
    setState('recognizing')
    try {
      const canvas = document.createElement('canvas')
      // Crop to the central guide band (80% width, 25% height) for accuracy.
      const vw = video?.videoWidth || 640
      const vh = video?.videoHeight || 480
      const cw = Math.round(vw * 0.8)
      const ch = Math.round(vh * 0.25)
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (ctx && video) {
        ctx.filter = 'grayscale(1) contrast(1.4)'
        ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, cw, ch)
      }
      const result = await recognizeSerial(canvas)
      if (result.text) {
        setText(result.text)
        setConfidence(Math.round(result.confidence))
        setState('result')
      } else {
        setState('empty')
      }
    } catch {
      setState('empty')
    }
  }

  if (error) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 bg-white p-6 text-center">
        <CameraOff size={32} className="text-gray-400" />
        <p className="text-sm text-gray-600">{t(`cameraError.${error}`)}</p>
        <Button variant="secondary" onClick={() => setRetryKey((k) => k + 1)}>
          {t('retryCamera')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} playsInline muted className="w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-1/4 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
        </div>
      </div>
      <p className="text-center text-xs text-gray-400">{t('serialGuideHint')}</p>

      {(state === 'ready' || state === 'recognizing') && (
        <Button className="w-full" onClick={handleCapture} disabled={state === 'recognizing'}>
          <Camera size={16} className="mr-1" />
          {state === 'recognizing' ? t('recognizing') : t('capture')}
        </Button>
      )}

      {state === 'result' && (
        <div className="space-y-2">
          <Input
            id="recognized-serial"
            label={t('recognizedLabel')}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-gray-500">{t('confidenceHint', { value: confidence })}</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onDetected(text)} disabled={!text}>
              {t('useSerial')}
            </Button>
            <Button variant="secondary" onClick={() => setState('ready')} aria-label={t('retake')}>
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>
      )}

      {state === 'empty' && (
        <div className="space-y-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
          <p className="text-sm text-gray-700">{t('nothingReadable')}</p>
          <Button variant="secondary" className="w-full" onClick={() => setState('ready')}>
            {t('retake')}
          </Button>
        </div>
      )}
    </div>
  )
}
```

(If the `retake` button-by-name query in the test fails because the button renders only an icon, either add visible text to the retake button in the `empty` state — as the code above does — or query by `aria-label`; keep test and code consistent.)

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run __tests__/components/serial-ocr-scanner.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```bash
git add src/components/scanner/serial-ocr-scanner.tsx messages __tests__/components/serial-ocr-scanner.test.tsx
git commit -m "feat: single-shot serial OCR capture component"
```

---

### Task 7: Scan page mode toggle + serial lookup flow

**Files:**
- Modify: `src/app/(main)/scan/page.tsx`
- Test: manual + existing suites (page is thin glue over already-tested parts; `__tests__/api/scan.test.ts` from Task 3 covers the lookup)

**Interfaces:**
- Consumes: `SerialOcrScanner` (Task 6), `ContentTabs` from `@/components/ui/content-tabs`, existing `handleScan` + `/api/scan` (Task 3), i18n keys from Task 6 (`modeBarcode`, `modeSerial`, `addAsNewAsset`).
- Produces: scan page with `[Barcode | Serial]` toggle; serial-mode not-found links to `/assets/new?serialNo=<text>` (consumed by Task 4's page change).

- [ ] **Step 1: Implement** — in `src/app/(main)/scan/page.tsx`:

1a. Add imports and dynamic component (next to the BarcodeScanner dynamic import):

```tsx
import { Barcode, TextCursorInput } from 'lucide-react'
import { ContentTabs } from '@/components/ui/content-tabs'

const SerialOcrScanner = dynamic(
  () => import('@/components/scanner/serial-ocr-scanner').then((m) => m.SerialOcrScanner),
  { ssr: false, loading: () => <Loading /> }
)
```

1b. Add mode state and reset-on-switch:

```tsx
type ScanMode = 'barcode' | 'serial'
const [mode, setMode] = useState<ScanMode>('barcode')

function handleModeChange(next: ScanMode) {
  setMode(next)
  setFoundItem(null)
  setScannedBarcode('')
  setState('scanning')
}
```

1c. Render the toggle above the camera container (inside the `scanning`/`loading` block, before the black-bg div):

```tsx
<ContentTabs
  tabs={[
    { key: 'barcode', icon: Barcode, label: t('modeBarcode') },
    { key: 'serial', icon: TextCursorInput, label: t('modeSerial') },
  ]}
  active={mode}
  onChange={handleModeChange}
/>
```

1d. In the camera container render by mode — `SerialOcrScanner` gets a plain (non-black) wrapper since it manages its own frame:

```tsx
{state === 'scanning' && mode === 'barcode' && <BarcodeScanner onScan={handleScan} />}
{state === 'scanning' && mode === 'serial' && <SerialOcrScanner onDetected={handleScan} />}
```

Show the `supportedFormats` hint only when `mode === 'barcode'`.

1e. In the `not-found` block, make the primary action mode-dependent:

```tsx
{mode === 'serial' ? (
  <Link href={`/assets/new?serialNo=${encodeURIComponent(scannedBarcode)}`} className="flex-1">
    <Button className="w-full">
      <Plus size={16} className="mr-1" />
      {t('addAsNewAsset')}
    </Button>
  </Link>
) : (
  <Link href={`/items/new?barcode=${encodeURIComponent(scannedBarcode)}`} className="flex-1">
    <Button className="w-full">
      <Plus size={16} className="mr-1" />
      {t('addAsNew')}
    </Button>
  </Link>
)}
```

(Adapt wrapper markup/classNames to what is already there; `handleScan` is reused untouched — OCR text goes through the same `/api/scan?barcode=` lookup.)

- [ ] **Step 2: Verify**

Run: `npx vitest run` — Expected: PASS (no regressions).
Run: `pnpm build` — Expected: build succeeds (catches server/client boundary mistakes and the dynamic import).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(main)/scan/page.tsx"
git commit -m "feat: barcode/serial mode toggle with OCR lookup on scan page"
```

---

### Task 8: OCR capture button on AssetForm

**Files:**
- Modify: `src/components/assets/asset-form.tsx`
- Modify: `messages/en.json`, `messages/zh-TW.json` (`assetForm` namespace)
- Test: extend `__tests__/components/asset-form-serial.test.tsx`

**Interfaces:**
- Consumes: `SerialOcrScanner` (Task 6), `Modal` from `@/components/ui/modal` (`{ open, onClose, title, children }`), serial field from Task 4.
- Produces: camera button beside the serial input; OCR result fills `form.serialNo`.

- [ ] **Step 1: Add i18n keys** — `assetForm` namespace, both files, after `serialNoPlaceholder`:

en: `"scanSerial": "Scan serial number with camera",` and `"scanSerialTitle": "Scan Serial Number",`
zh-TW: `"scanSerial": "以相機掃描序號",` and `"scanSerialTitle": "掃描序號",`

- [ ] **Step 2: Write the failing test** — append to `__tests__/components/asset-form-serial.test.tsx` (mock the scanner at top of file with the other mocks):

```tsx
vi.mock('@/components/scanner/serial-ocr-scanner', () => ({
  SerialOcrScanner: ({ onDetected }: { onDetected: (t: string) => void }) => (
    <button onClick={() => onDetected('SN-FROM-CAMERA')}>mock-detect</button>
  ),
}))
```

```tsx
it('fills the serial field from OCR capture', async () => {
  renderForm()
  await userEvent.click(await screen.findByRole('button', { name: en.assetForm.scanSerial }))
  await userEvent.click(await screen.findByRole('button', { name: 'mock-detect' }))
  expect(screen.getByLabelText(en.assetForm.serialNoLabel)).toHaveValue('SN-FROM-CAMERA')
})
```

Note: if AssetForm imports the scanner via `next/dynamic`, the static `vi.mock` above still intercepts it as long as the mock path matches the imported module path — prefer a direct (non-dynamic) import inside the Modal since the Modal children only mount when open; if you use `next/dynamic` anyway, keep `ssr: false` and confirm the test passes.

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run __tests__/components/asset-form-serial.test.tsx`
Expected: FAIL — no button named `scanSerial`.

- [ ] **Step 4: Implement** — in `asset-form.tsx`: add `const [showOcr, setShowOcr] = useState(false)`; wrap the Task-4 serial `<Input>` in a flex row with a camera button; render the Modal:

```tsx
<div className="flex items-end gap-2">
  <div className="flex-1">
    <Input
      id="serial-no"
      label={t('serialNoLabel')}
      type="text"
      value={form.serialNo}
      onChange={(e) => handleChange('serialNo', e.target.value)}
      placeholder={t('serialNoPlaceholder')}
    />
  </div>
  <Button
    type="button"
    variant="secondary"
    onClick={() => setShowOcr(true)}
    aria-label={t('scanSerial')}
  >
    <Camera size={16} />
  </Button>
</div>

<Modal open={showOcr} onClose={() => setShowOcr(false)} title={t('scanSerialTitle')}>
  <SerialOcrScanner
    onDetected={(text) => {
      handleChange('serialNo', text)
      setShowOcr(false)
    }}
  />
</Modal>
```

Imports: `Camera` from `lucide-react`, `Modal` from `@/components/ui/modal`, `SerialOcrScanner` from `@/components/scanner/serial-ocr-scanner`.

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run __tests__/components/asset-form-serial.test.tsx` — Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```bash
git add src/components/assets/asset-form.tsx messages __tests__/components/asset-form-serial.test.tsx
git commit -m "feat: OCR capture button fills serial number on asset form"
```

---

### Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: ALL tests pass, including every pre-existing suite.

- [ ] **Step 2: Lint + build**

Run: `pnpm lint` — Expected: no errors.
Run: `pnpm build` — Expected: production build succeeds.

- [ ] **Step 3: Manual browser verification** (real OCR cannot run in jsdom — this step is mandatory; use the project `verify` skill to launch the app):

1. `pnpm dev`, open `http://localhost:3000/scan` on a device with a camera (or Chrome with a virtual camera).
2. Toggle to Serial mode → point at any printed serial (e.g. a charger label) → Capture → verify recognized text appears, edit it, Look up → not-found → "Register as New Asset" → form opens with serial pre-filled.
3. Save the asset → scan the same serial again → verify it now resolves to the asset detail page.
4. Asset form: use the camera button → verify OCR fills the field.
5. Verify barcode mode still scans a known item barcode.
6. Check the network tab: `worker.min.js`, core wasm, and `eng.traineddata.gz` all load from `/ocr/...` (NOT a CDN).

- [ ] **Step 4: No-commit checkpoint** — report results to the user; committing/merging is decided by the user (project rule: no auto-commit beyond task commits already made).
