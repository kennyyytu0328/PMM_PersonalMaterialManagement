# Sub-Path Production Deployment Support — Design

**Date:** 2026-07-09
**Status:** Approved
**Goal:** Deploy PMM behind the upstream nginx at `https://www.gogoffcc.com/gogoffcc-pmm/`, mirroring the GoGoFresh Attendance topology (upstream TLS → host nginx strip → `127.0.0.1`-bound container), while keeping root-path local development unchanged.

## Context

- Reference deployment: `GoGoFresh_AttendanceRecord/docs/PRODUCTION_DEPLOYMENT_GUIDE.md` (Option C — sub-path behind upstream proxy). Its Next.js 16 findings apply directly: `basePath` affects URL/asset *generation* only; the server still serves routes unprefixed, so host nginx strips the prefix with trailing-slash `proxy_pass`.
- PMM today has no basePath support: 27 hardcoded `fetch('/api/...')` calls across 14 files, `SessionProvider` without basePath, proxy redirects that assume root path, and an entrypoint that always seeds sample data.
- Host port 3000 is taken by the GoGoFresh frontend on the production server; PMM will use 3001 (configurable, with a documented pre-deploy `ss -tlnp` check).

## Decisions (user-confirmed)

| Decision | Value |
|---|---|
| Deployment target | Same server as GoGoFresh, behind the same upstream, at a sub-path |
| URL prefix | `/gogoffcc-pmm` (consistent with existing `/gogoffcc-pms`, `/gogoffcc-arms`) |
| Production seeding | Admin user only, via `SEED_SAMPLE_DATA=false`; admin password from `ADMIN_INITIAL_PASSWORD` |
| Host port | `127.0.0.1:3001` default, overridable via root `.env` (`PMM_HOST_PORT`) |
| Prefix mechanism | Build-time `NEXT_PUBLIC_BASE_PATH` (baked into bundle; rebuild required to change) |

## Components

### 1. basePath wiring — `next.config.ts`

```ts
basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined
```

Unset locally → dev/root-path behavior is byte-identical. Set to `/gogoffcc-pmm` at image build time via Dockerfile `ARG NEXT_PUBLIC_BASE_PATH` / `ENV` before `pnpm build`.

### 2. API fetch helper — `src/lib/api.ts` (new)

```ts
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, init)
}
```

All 27 `fetch('/api/...')` call sites in the 14 client files switch to `apiFetch('/api/...')`. Mechanical replacement; no behavior change at root path. `NEXT_PUBLIC_*` is statically inlined by Next at build time, so this works in client bundles.

### 3. NextAuth v5 — `src/lib/auth.config.ts`, `src/app/providers.tsx`

- `trustHost: true` in `authConfig` — required behind the TLS-terminating upstream so Auth.js trusts `X-Forwarded-Host` / `X-Forwarded-Proto`.
- Production env: `AUTH_URL=https://www.gogoffcc.com/gogoffcc-pmm/api/auth` (v5 derives its server-side basePath from the URL's pathname). Keep `NEXTAUTH_URL`/`NEXTAUTH_SECRET` working for local dev.
- `SessionProvider` gets `basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/auth`}` so client-side `signIn()`/`useSession()` hit the prefixed endpoints.

### 4. Proxy redirect fix — `src/proxy.ts`

The two `NextResponse.redirect(new URL('/login' | '/dashboard', req.url))` calls drop the prefix under basePath. They become:

```ts
new URL(`${req.nextUrl.basePath}/login`, req.url)
```

Matcher patterns are basePath-relative in Next.js and stay unchanged.

### 5. Production-safe seeding — `scripts/seed.mjs`, `scripts/docker-entrypoint.sh`

- `SEED_SAMPLE_DATA` (default `'true'`): when `'false'`, seed creates **only** the admin user — no categories/locations/items/transactions.
- `ADMIN_INITIAL_PASSWORD` (default `admin123`): bcrypt-hashed into the admin row on first seed. Guide mandates changing it after first login regardless.
- Idempotency check (users table row count) unchanged.

### 6. Production compose — `docker-compose.prod.yml` (new file)

- Build args: `NEXT_PUBLIC_BASE_PATH=/gogoffcc-pmm`.
- Ports: `127.0.0.1:${PMM_HOST_PORT:-3001}:3000` — loopback only; host nginx is the sole consumer.
- Env: `TZ=Asia/Taipei`, `SEED_SAMPLE_DATA=false`, `AUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_INITIAL_PASSWORD`, `DATABASE_URL=file:/app/data/pmm.db`.
- Secrets interpolated from a root `.env` (gitignored, `chmod 600`); ship a `.env.production.example` template.
- Volume `pmm-data:/app/data`, `restart: unless-stopped`.
- Local `docker-compose.yml` untouched.

### 7. Dockerfile

Add `ARG NEXT_PUBLIC_BASE_PATH` + `ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH` in the builder stage (before `pnpm build`). Ensure `TZ` support (alpine: `tzdata` package) for `Asia/Taipei`.

### 8. Deployment guide — `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` (new)

Modeled section-for-section on the GoGoFresh guide, adapted:

- Topology diagram (single container — no separate API port, one nginx location block).
- Pre-deploy port check (`sudo ss -tlnp | grep ':3001'`).
- Secrets (`openssl rand -base64 32` for `NEXTAUTH_SECRET`; strong `ADMIN_INITIAL_PASSWORD`).
- Env setup from `.env.production.example`.
- Build/start: `docker compose -f docker-compose.prod.yml up -d --build`.
- Host nginx: **one** strip block `location /gogoffcc-pmm/ { proxy_pass http://127.0.0.1:3001/; ... }` with `X-Forwarded-Proto https`, `X-Forwarded-Host`, websocket upgrade headers.
- Upstream ask: one-line mirror of the existing `/gogoffcc-pms/` rule.
- Local smoke test before involving upstream (`curl -H 'Host: www.gogoffcc.com' http://127.0.0.1/gogoffcc-pmm/login` → 200; direct container test unprefixed).
- Smoke-test matrix (login, `_next/static` under prefix, API calls under prefix, barcode scanner camera on HTTPS, language switcher cookie).
- Backups: nightly cron using `sqlite3 /app/data/pmm.db ".backup '/app/data/backup-…'"` inside the container + copy out; explicitly NOT a raw file copy (WAL mode is not crash-consistent to copy live).
- Upgrades (`git pull` → `up -d --build`; migrations auto-run by entrypoint), rollback notes.
- Go-live checklist + troubleshooting table (404 = strip rule; auth redirect loop = `AUTH_URL`/`trustHost`; assets 404 = missing build arg).

## Data flow (request path)

```
Browser https://www.gogoffcc.com/gogoffcc-pmm/items
  → upstream nginx (TLS) → server:80
  → host nginx location /gogoffcc-pmm/ (strip) → 127.0.0.1:3001/items
  → Next.js serves route; HTML/JS URLs carry /gogoffcc-pmm via basePath
Client JS apiFetch('/api/items') → /gogoffcc-pmm/api/items → same strip → /api/items
NextAuth signIn → /gogoffcc-pmm/api/auth/callback/credentials → strip → /api/auth/...
```

**Implementation correction (Task 10):** the strip claims above were disproven during end-to-end verification. Next.js 16.2.1's standalone server serves routes and assets **under** the `basePath` prefix — `curl 127.0.0.1:3001/gogoffcc-pmm/login` → 200, `curl 127.0.0.1:3001/login` → 404 (empirically verified, not stripped). Host nginx must therefore **preserve** the prefix (`proxy_pass http://127.0.0.1:3001;` with no trailing slash/URI part), not strip it. Auth.js also does not infer its action-parsing `basePath` from `AUTH_URL` alone — `authConfig.basePath` must be set explicitly (see `src/lib/auth.config.ts`) or every `/api/auth/*` call 400s with `UnknownAction`. `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` has been corrected accordingly; treat this section's diagram/prose above as historical context, not current guidance.

## Testing

- Unit: `apiFetch` prefix behavior (with/without env); seed script flag logic (admin-only vs full).
- Regression: full existing Vitest suite green; `pnpm build` succeeds with `NEXT_PUBLIC_BASE_PATH` unset **and** set.
- Manual: root-path dev flow in browser (login, items CRUD) unchanged; guide's smoke-test matrix covers the prod path (runs on the server, documented rather than executed here).

## Error handling

No new runtime error paths. Misconfiguration is surfaced operationally via the guide's smoke-test matrix and troubleshooting table (mirroring GoGoFresh §7.1/§11 decision tables).

## Out of scope

- CI/CD image publishing (ghcr.io) — future work.
- Localizing server-side error strings.
- Changing the local dev workflow in any way.
