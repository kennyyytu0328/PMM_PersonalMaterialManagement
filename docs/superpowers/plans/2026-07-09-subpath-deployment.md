# Sub-Path Deployment Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PMM deployable at `https://www.gogoffcc.com/gogoffcc-pmm/` behind the upstream nginx (GoGoFresh topology) while keeping root-path local dev byte-identical.

**Architecture:** Build-time `NEXT_PUBLIC_BASE_PATH` drives Next.js `basePath` and a central `apiFetch` helper; NextAuth v5 gets `trustHost` + `AUTH_URL`/`SessionProvider basePath`; production runs from a new `docker-compose.prod.yml` bound to `127.0.0.1:3001` with admin-only seeding.

**Tech Stack:** Next.js 16 (App Router, Turbopack), NextAuth v5, better-sqlite3, Vitest, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-07-09-subpath-deployment-design.md`
**Reference guide (source material for Task 9):** `D:\MyWorkData\WebApp_Tools\GoGoFresh_AttendanceRecord\docs\PRODUCTION_DEPLOYMENT_GUIDE.md`

## Global Constraints

- URL prefix is exactly `/gogoffcc-pmm` (no trailing slash) wherever hardcoded in prod config/docs.
- `NEXT_PUBLIC_BASE_PATH` must default to empty/unset → all existing root-path behavior unchanged.
- Never destructure `process.env` for `NEXT_PUBLIC_*` — Next.js inlines only the full `process.env.NEXT_PUBLIC_BASE_PATH` expression into client bundles.
- Production host port default `3001`, overridable as `PMM_HOST_PORT` in root `.env`; container port stays 3000.
- Production seeds admin only (`SEED_SAMPLE_DATA=false`); never print `ADMIN_INITIAL_PASSWORD` to logs.
- Immutability, Zod validation, `{ success, data?, error? }` API shape per project CLAUDE.md (unchanged by this work).
- Test runner: `npx vitest run <file>`; full suite `pnpm test`. Build: `pnpm build`.
- **Commits:** conventional format (`feat:`/`chore:`/`docs:`). The executor must obtain the user's one-time authorization for per-task commits at execution start (user rule: no commits without explicit instruction). If not granted, skip all commit steps and leave changes staged-uncommitted.
- Windows dev machine: PowerShell syntax for env vars in verification commands (`$env:NAME='value'`).

---

### Task 1: `apiFetch` helper

**Files:**
- Create: `src/lib/api.ts`
- Test: `__tests__/lib/api.test.ts`

**Interfaces:**
- Produces: `apiFetch(path: string, init?: RequestInit): Promise<Response>` — exact name/signature consumed by Task 2.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('calls fetch with the bare path when NEXT_PUBLIC_BASE_PATH is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)

    const { apiFetch } = await import('@/lib/api')
    await apiFetch('/api/items')

    expect(fetchMock).toHaveBeenCalledWith('/api/items', undefined)
  })

  it('prefixes the path when NEXT_PUBLIC_BASE_PATH is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/gogoffcc-pmm')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)

    const { apiFetch } = await import('@/lib/api')
    await apiFetch('/api/items', { method: 'POST' })

    expect(fetchMock).toHaveBeenCalledWith('/gogoffcc-pmm/api/items', { method: 'POST' })
  })

  it('passes through init options unchanged', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/gogoffcc-pmm')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)

    const { apiFetch } = await import('@/lib/api')
    const init = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' }
    await apiFetch('/api/items/5', init)

    expect(fetchMock).toHaveBeenCalledWith('/gogoffcc-pmm/api/items/5', init)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/api.test.ts`
Expected: FAIL — cannot resolve `@/lib/api`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/api.ts
/**
 * Base-path-aware fetch for calling PMM API routes from client components.
 * NEXT_PUBLIC_BASE_PATH is inlined at build time (empty at root path,
 * e.g. "/gogoffcc-pmm" for sub-path production builds). Next.js only
 * inlines the full `process.env.NEXT_PUBLIC_BASE_PATH` expression, so it
 * must not be destructured.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, init)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/api.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit (if authorized)**

```bash
git add src/lib/api.ts __tests__/lib/api.test.ts
git commit -m "feat: add base-path-aware apiFetch helper"
```

---

### Task 2: Migrate all 27 `fetch('/api/...')` call sites to `apiFetch`

**Files (Modify — occurrence counts from `grep "fetch\('/api"`):**
- `src/app/(main)/items/[id]/page.tsx` (4)
- `src/app/(main)/reports/page.tsx` (3)
- `src/app/(main)/items/page.tsx` (3)
- `src/components/items/checkout-modal.tsx` (2)
- `src/app/(main)/dashboard/page.tsx` (2)
- `src/components/items/item-form.tsx` (2)
- `src/app/(main)/admin/users/page.tsx` (2)
- `src/app/(main)/admin/categories/page.tsx` (2)
- `src/app/(main)/admin/locations/page.tsx` (2)
- `src/app/(main)/scan/page.tsx` (1)
- `src/app/(main)/profile/page.tsx` (1)
- `src/app/(main)/items/[id]/edit/page.tsx` (1)
- `src/components/items/stock-modal.tsx` (1)
- `src/app/(main)/activity/page.tsx` (1)

**Interfaces:**
- Consumes: `apiFetch(path, init?)` from Task 1 (`import { apiFetch } from '@/lib/api'`).

- [ ] **Step 1: Apply the mechanical transformation to every listed file**

In each file:
1. Add `import { apiFetch } from '@/lib/api'` to the existing import block.
2. Replace every call-expression `fetch('/api/...` → `apiFetch('/api/...` (also template-literal forms like ``fetch(`/api/items/${id}`)`` → ``apiFetch(`/api/items/${id}`)``). Arguments/options objects unchanged.

Do NOT touch: `src/app/(auth)/login/page.tsx` (uses NextAuth `signIn`, not raw fetch) or any server-side code.

- [ ] **Step 2: Verify zero raw API fetches remain**

Run: `grep -rn "fetch('/api\|fetch(\`/api" src/` (or the Grep tool with pattern `fetch\(['"\`]/api` on `src/`)
Expected: no matches.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all tests PASS (behavior identical at root path — `BASE_PATH` is '').

- [ ] **Step 4: Commit (if authorized)**

```bash
git add -A src/
git commit -m "refactor: route all client API calls through apiFetch"
```

---

### Task 3: Next.js `basePath` wiring

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- Produces: builds honor `NEXT_PUBLIC_BASE_PATH` env; consumed by Tasks 7–8 (Docker build arg).

- [ ] **Step 1: Edit `next.config.ts`**

```ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  // Set at build time for sub-path deployments (e.g. "/gogoffcc-pmm").
  // Undefined locally → root-path behavior unchanged.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
}

export default withNextIntl(nextConfig)
```

- [ ] **Step 2: Verify root-path build is unaffected**

Run: `pnpm build`
Expected: build succeeds; route table printed with no prefix.

- [ ] **Step 3: Verify prefixed build succeeds**

Run (PowerShell): `$env:NEXT_PUBLIC_BASE_PATH='/gogoffcc-pmm'; pnpm build; Remove-Item Env:NEXT_PUBLIC_BASE_PATH`
Expected: build succeeds. (Runtime behavior verified in Task 10 via Docker.)

- [ ] **Step 4: Commit (if authorized)**

```bash
git add next.config.ts
git commit -m "feat: support NEXT_PUBLIC_BASE_PATH basePath in next config"
```

---

### Task 4: NextAuth v5 sub-path + proxy trust

**Files:**
- Modify: `src/lib/auth.config.ts`
- Modify: `src/app/providers.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: server trusts `X-Forwarded-*` (`trustHost`); client auth calls honor the prefix. Prod env contract (Task 8): `AUTH_URL=https://www.gogoffcc.com/gogoffcc-pmm/api/auth`.

- [ ] **Step 1: Add `trustHost` to `src/lib/auth.config.ts`**

Add one property to the exported `authConfig` object (after `secret`):

```ts
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  // Required behind the TLS-terminating upstream proxy: trust
  // X-Forwarded-Host / X-Forwarded-Proto from host nginx.
  trustHost: true,
```

- [ ] **Step 2: Point `SessionProvider` at the prefixed auth endpoint in `src/app/providers.tsx`**

```tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/auth`}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
```

- [ ] **Step 3: Run the full test suite and root-path manual check**

Run: `pnpm test`
Expected: PASS.
Then with the dev server running (`pnpm dev`), verify in a browser at `http://localhost:3000`: log in as `admin@pmm.local` / `admin123` → lands on dashboard; log out works. (Root path: `basePath` prop is `/api/auth`, identical to the default.)

- [ ] **Step 4: Commit (if authorized)**

```bash
git add src/lib/auth.config.ts src/app/providers.tsx
git commit -m "feat: trustHost + base-path-aware SessionProvider for proxied deploys"
```

---

### Task 5: Proxy redirect fix

**Files:**
- Modify: `src/proxy.ts:12-19`

**Interfaces:**
- Consumes: nothing. `req.nextUrl.basePath` is `''` at root path → behavior unchanged locally.

- [ ] **Step 1: Prefix redirect URLs with `req.nextUrl.basePath`**

Replace the two redirects in the `auth(...)` callback:

```ts
export default auth((req) => {
  const { pathname, basePath } = req.nextUrl
  const session = req.auth

  // Redirect unauthenticated users to login
  if (!session?.user) {
    return NextResponse.redirect(new URL(`${basePath}/login`, req.url))
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && (session.user as any)?.role !== 'admin') {
    return NextResponse.redirect(new URL(`${basePath}/dashboard`, req.url))
  }

  return NextResponse.next()
})
```

`config.matcher` stays unchanged (Next matchers are basePath-relative).

- [ ] **Step 2: Verify root-path behavior unchanged**

With `pnpm dev` running, in a private/incognito browser window (no session cookie) open `http://localhost:3000/dashboard`.
Expected: redirected to `http://localhost:3000/login`.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit (if authorized)**

```bash
git add src/proxy.ts
git commit -m "fix: preserve basePath in proxy auth redirects"
```

---

### Task 6: Production-safe seeding

**Files:**
- Modify: `scripts/seed.mjs`
- Test: `__tests__/scripts/seed.test.ts` (create; also create the `__tests__/scripts/` directory)

**Interfaces:**
- Produces: env contract consumed by Task 8 — `SEED_SAMPLE_DATA` (`'false'` = admin only; anything else/unset = full sample data) and `ADMIN_INITIAL_PASSWORD` (default `admin123`).
- Consumes: `scripts/migrate.mjs` and `scripts/seed.mjs` both resolve the DB from `DATABASE_URL` (`file:` prefix stripped) — already true, verified.

- [ ] **Step 1: Write the failing integration test**

```ts
// __tests__/scripts/seed.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/scripts/seed.test.ts`
Expected: test 1 PASSES (current behavior), tests 2 and 3 FAIL (flags not implemented). That failing pair is the RED state.

- [ ] **Step 3: Implement the flags in `scripts/seed.mjs`**

Inside `async function seed()`, after the idempotency check, replace the body with flag-aware logic (sample-data block unchanged, only wrapped):

```js
  const seedSampleData = (process.env.SEED_SAMPLE_DATA ?? 'true') !== 'false'
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123'

  console.log('Seeding database...')

  // --- Users ---
  const passwordHash = await bcrypt.hash(adminPassword, 10)
  const adminResult = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       RETURNING id, email`
    )
    .get('Admin', 'admin@pmm.local', passwordHash, 'admin')

  console.log(`Created admin: ${adminResult.email}`)

  if (!seedSampleData) {
    console.log('SEED_SAMPLE_DATA=false — skipping sample data. Admin user only.')
    db.close()
    return
  }

  // --- Categories --- (existing block, unchanged)
  ...
```

At the bottom of the sample-data branch, replace the final credentials log (never print the actual password):

```js
  console.log(
    process.env.ADMIN_INITIAL_PASSWORD
      ? '\nLogin: admin@pmm.local (password from ADMIN_INITIAL_PASSWORD)'
      : '\nLogin: admin@pmm.local / admin123'
  )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/scripts/seed.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit (if authorized)**

```bash
git add scripts/seed.mjs __tests__/scripts/seed.test.ts
git commit -m "feat: SEED_SAMPLE_DATA and ADMIN_INITIAL_PASSWORD env flags for production seeding"
```

---

### Task 7: Dockerfile build args + tzdata

**Files:**
- Modify: `Dockerfile`

**Interfaces:**
- Produces: image honors `--build-arg NEXT_PUBLIC_BASE_PATH=...`; runner stage supports `TZ` env. Consumed by Task 8.

- [ ] **Step 1: Add the build arg to the builder stage**

Change the builder stage to:

```dockerfile
# Build
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm db:generate && pnpm build
```

- [ ] **Step 2: Add tzdata to the runner stage**

In the `runner` stage, extend the existing user-setup section:

```dockerfile
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# tzdata so TZ=Asia/Taipei (set in compose) takes effect on musl/alpine
RUN apk add --no-cache tzdata
RUN addgroup --system --gid 1001 nodejs
```

- [ ] **Step 3: Verify the Dockerfile builds with the arg**

Run: `docker build --build-arg NEXT_PUBLIC_BASE_PATH=/gogoffcc-pmm -t pmm:subpath-test .`
Expected: build completes (~3–5 min). Container-level runtime verification happens in Task 10.

- [ ] **Step 4: Commit (if authorized)**

```bash
git add Dockerfile
git commit -m "feat: NEXT_PUBLIC_BASE_PATH build arg and tzdata in Docker image"
```

---

### Task 8: `docker-compose.prod.yml` + env template

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `.env.production.example`

**Interfaces:**
- Consumes: Task 7 build arg; Task 6 seed env contract; Task 4 `AUTH_URL` contract.
- Produces: the deploy artifact Task 9's guide documents.

- [ ] **Step 1: Create `docker-compose.prod.yml`**

```yaml
# Production compose — sub-path deployment behind the upstream nginx.
# Secrets/overrides come from a root .env (copy .env.production.example → .env, chmod 600).
services:
  pmm:
    build:
      context: .
      args:
        NEXT_PUBLIC_BASE_PATH: /gogoffcc-pmm
    ports:
      # Loopback only — host nginx is the sole consumer. Port check: sudo ss -tlnp | grep ':3001'
      - "127.0.0.1:${PMM_HOST_PORT:-3001}:3000"
    volumes:
      - pmm-data:/app/data
    environment:
      - TZ=Asia/Taipei
      - DATABASE_URL=file:/app/data/pmm.db
      - AUTH_URL=${AUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - SEED_SAMPLE_DATA=false
      - ADMIN_INITIAL_PASSWORD=${ADMIN_INITIAL_PASSWORD}
    restart: unless-stopped

volumes:
  pmm-data:
```

- [ ] **Step 2: Create `.env.production.example`**

```bash
# Copy to `.env` on the production server, fill in real values, then: chmod 600 .env
# Host port published on 127.0.0.1 (must be free — check: sudo ss -tlnp | grep ':3001')
PMM_HOST_PORT=3001

# Public auth endpoint = https://<upstream-host><prefix>/api/auth
AUTH_URL=https://www.gogoffcc.com/gogoffcc-pmm/api/auth

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=

# First-boot admin password (admin@pmm.local). Change it in the app after first login anyway.
ADMIN_INITIAL_PASSWORD=
```

- [ ] **Step 3: Verify compose file validity and env-example is committable**

Run: `docker compose -f docker-compose.prod.yml config --quiet`
Expected: exits 0 (warnings about unset env vars are OK).
Run: `git check-ignore .env.production.example`
Expected: exits non-zero (NOT ignored — `.gitignore` only ignores `.env`, `.env.local`, `.env.*.local`).

- [ ] **Step 4: Commit (if authorized)**

```bash
git add docker-compose.prod.yml .env.production.example
git commit -m "feat: production docker-compose for sub-path deployment"
```

---

### Task 9: Production deployment guide

**Files:**
- Create: `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- Reference (read first): `D:\MyWorkData\WebApp_Tools\GoGoFresh_AttendanceRecord\docs\PRODUCTION_DEPLOYMENT_GUIDE.md`

**Interfaces:**
- Consumes: everything above. All values must match: prefix `/gogoffcc-pmm`, port `3001`/`PMM_HOST_PORT`, env names `AUTH_URL`, `NEXTAUTH_SECRET`, `SEED_SAMPLE_DATA`, `ADMIN_INITIAL_PASSWORD`.

- [ ] **Step 1: Write the guide** with these sections, mirroring the GoGoFresh guide's structure and tone (English, decision-table style):

1. **Topology diagram** — same two-nginx chain, but ONE container (`pmm`, `127.0.0.1:3001`) and no db service (SQLite in `pmm-data` volume). Note: Next.js API routes ARE the backend → one nginx location block, not two.
2. **Prerequisites** — Docker ≥ 24 + Compose v2, internal IP reachable by upstream, coordination for the upstream rule, `openssl`. Explicitly NOT needed: own domain/TLS/DB server.
3. **Clone the repo** — reuse the GoGoFresh §1.1 auth guidance (API token / PAT / SSH deploy key) by adapting it, not by reference.
4. **Pre-deploy port check**:
   ```bash
   sudo ss -tlnp | grep ':3001'   # no output = free; if taken, set PMM_HOST_PORT in .env
   docker ps --format 'table {{.Names}}\t{{.Ports}}'
   ```
5. **Secrets & env** — `openssl rand -base64 32` → `NEXTAUTH_SECRET`; strong `ADMIN_INITIAL_PASSWORD`; `cp .env.production.example .env && chmod 600 .env`.
6. **Build & start** — `docker compose -f docker-compose.prod.yml up -d --build`; first boot auto-migrates and seeds admin-only (entrypoint); verify with `docker compose -f docker-compose.prod.yml logs --tail 50` (expect migration `[ok]` lines and "Admin user only").
7. **Timezone check** — `docker compose -f docker-compose.prod.yml exec pmm date` → must show `+0800`.
8. **Host nginx** — single strip block, verbatim:
   ```nginx
   # === PMM (Personal Material Management) — served at /gogoffcc-pmm/ ===
   location /gogoffcc-pmm/ {
       proxy_pass         http://127.0.0.1:3001/;   # trailing slash strips the prefix
       proxy_http_version 1.1;
       proxy_set_header   Host              $host;
       proxy_set_header   X-Real-IP         $remote_addr;
       proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
       proxy_set_header   X-Forwarded-Proto https;
       proxy_set_header   X-Forwarded-Host  $host;
       proxy_set_header   Upgrade           $http_upgrade;
       proxy_set_header   Connection        "upgrade";
       proxy_read_timeout 60s;
   }
   ```
   Include the same Next.js 16 note as GoGoFresh §6.1 (server serves unprefixed; basePath affects URL generation only) and `sudo nginx -t && sudo systemctl reload nginx`.
9. **Upstream ask** — one line: mirror the existing `/gogoffcc-pms/` rule for `/gogoffcc-pmm/` → `<our-server>:80`.
10. **Local smoke test before upstream**:
    ```bash
    curl -I  http://127.0.0.1:3001/login                                  # direct: 200 (unprefixed)
    curl -s  http://127.0.0.1:3001/login | grep -o 'gogoffcc-pmm' | head -1   # assets carry prefix
    curl -I -H 'Host: www.gogoffcc.com' -H 'X-Forwarded-Proto: https' \
         http://127.0.0.1/gogoffcc-pmm/login                              # through host nginx: 200
    ```
11. **Public smoke-test matrix** (numbered, pass criteria): login page renders under prefix; `_next/static` all under prefix (zero root `/_next/`); credentials login POST → `/gogoffcc-pmm/api/auth/callback/credentials` 302 + lands on dashboard; items list loads (`/gogoffcc-pmm/api/items` 200); barcode scanner camera works (HTTPS from upstream); language switcher persists (`NEXT_LOCALE` cookie); logout → back to login under prefix.
12. **Backups** — nightly cron; `sqlite3 .backup` inside the container, NOT a raw file copy (WAL not crash-consistent):
    ```bash
    # /etc/cron.daily/pmm-backup
    #!/bin/bash
    set -e
    BACKUP_DIR=/var/backups/pmm
    mkdir -p "$BACKUP_DIR"
    cd ~/personal-material-management
    docker compose -f docker-compose.prod.yml exec -T pmm \
        node -e "const db=require('better-sqlite3')('/app/data/pmm.db');db.backup('/app/data/backup.db').then(()=>{db.close()})"
    docker compose -f docker-compose.prod.yml cp pmm:/app/data/backup.db "$BACKUP_DIR/pmm-$(date +%F).db"
    docker compose -f docker-compose.prod.yml exec -T pmm rm /app/data/backup.db
    gzip -f "$BACKUP_DIR/pmm-$(date +%F).db"
    find "$BACKUP_DIR" -name '*.db.gz' -mtime +30 -delete
    ```
    (The image has no `sqlite3` CLI; better-sqlite3's online-backup API is the equivalent safe mechanism.) Restore: stop stack, replace `/app/data/pmm.db` in the volume with the backup, start.
13. **Upgrades** — `git pull` → `up -d --build` (⚠️ prefix baked at build time; entrypoint auto-migrates). Rollback: `git checkout <prev>` + rebuild; restore DB backup first if the release migrated schema.
14. **Go-live checklist** — secrets strong + `chmod 600` + not committed; port free/adjusted; `SEED_SAMPLE_DATA=false` confirmed via logs; admin password changed after first login; nginx strip rule + upstream rule live; smoke matrix green; backup cron installed and one run verified; `docker compose ps` healthy after reboot; container clock `+0800`.
15. **Troubleshooting table** — symptom/cause/fix: assets 404 under prefix → build arg missing (rebuild); redirect to `/login` without prefix → proxy fix missing or old image; auth `UntrustedHost` error → `trustHost`/`AUTH_URL` wrong; login loop → `AUTH_URL` path ≠ actual prefix; API 404 through upstream but 200 direct → nginx strip slash missing; camera dead → not on HTTPS origin; sample items appeared in prod → `SEED_SAMPLE_DATA` unset at first boot (volume already seeded — clean via UI or reset volume before real data exists).

- [ ] **Step 2: Cross-check every literal** (prefix, port, env var names, file paths, compose service name `pmm`) against Tasks 6–8 outputs. Fix mismatches in the guide, not in code.

- [ ] **Step 3: Commit (if authorized)**

```bash
git add docs/PRODUCTION_DEPLOYMENT_GUIDE.md
git commit -m "docs: production deployment guide for sub-path deploy"
```

---

### Task 10: End-to-end verification

**Files:** none (verification only). Requires Docker running locally.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: all suites PASS (including new `api.test.ts`, `seed.test.ts`).

- [ ] **Step 2: Root-path production build**

Run: `pnpm build`
Expected: success, no prefix in route output.

- [ ] **Step 3: Sub-path image build + runtime smoke test**

```bash
docker build --build-arg NEXT_PUBLIC_BASE_PATH=/gogoffcc-pmm -t pmm:subpath-test .
docker run -d --name pmm-subpath-test -p 127.0.0.1:3001:3000 \
  -e DATABASE_URL=file:/app/data/pmm.db \
  -e AUTH_URL=http://localhost:3001/gogoffcc-pmm/api/auth \
  -e NEXTAUTH_SECRET=test-secret-for-smoke-only \
  -e SEED_SAMPLE_DATA=false \
  -e ADMIN_INITIAL_PASSWORD=SmokeTest123! \
  -e TZ=Asia/Taipei \
  pmm:subpath-test
```

Then verify:
```bash
docker logs pmm-subpath-test          # expect: migrations [ok], "Admin user only", server started
docker exec pmm-subpath-test date      # expect: +0800 (CST)
curl -I  http://127.0.0.1:3001/login   # expect: 200 (Next 16 serves unprefixed)
curl -s  http://127.0.0.1:3001/login | grep -c 'gogoffcc-pmm'   # expect: > 0 (assets prefixed)
curl -s  http://127.0.0.1:3001/api/auth/providers               # expect: JSON with credentials provider
```

- [ ] **Step 4: Cleanup**

```bash
docker rm -f pmm-subpath-test
docker rmi pmm:subpath-test
```

- [ ] **Step 5: Local root-path regression in browser**

With `pnpm dev`: login → dashboard → items list loads → open an item → logout. All at `http://localhost:3000` with no prefix anywhere.

- [ ] **Step 6: Report**

Present full outputs (test summary, build tail, curl results) to the main loop for gate acceptance — no bare "it passed".
