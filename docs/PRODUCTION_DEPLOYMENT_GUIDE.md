# Production Deployment Guide

PMM (Personal Material Management) — step-by-step guide for deploying to the shared production server behind `www.gogoffcc.com`.

> This guide assumes you already have the app running locally (`pnpm dev` or `docker compose up -d` against the plain `docker-compose.yml`). If not, start there first.

## Topology (as actually deployed)

```
┌─ Browser ─────────────────────────────────────────────────────────┐
│ HTTPS                                                              │
│   ↓                                                                │
│ www.gogoffcc.com  (upstream nginx — owned by colleague, TLS here) │
│   ↓ HTTP, /gogoffcc-pmm/*  →  <our-server-internal-ip>:80          │
│   ↓                                                                │
│ Our server (Ubuntu)                                                │
│   ├─ host nginx :80                                                │
│   │     └─ /gogoffcc-pmm/  → 127.0.0.1:3001/  (strip)             │
│   └─ docker compose -f docker-compose.prod.yml                    │
│         └─ pmm  (Next.js 16, 127.0.0.1:3001 → container :3000)    │
│               data: SQLite file in the `pmm-data` named volume    │
└──────────────────────────────────────────────────────────────────┘
```

**Key facts about this setup:**

1. **TLS terminates upstream**, not on our server. Our container speaks plain HTTP on the internal network. The browser only ever sees `https://www.gogoffcc.com`, never our IP.
2. **We do not own the public domain.** The auth endpoint (`AUTH_URL`) is pinned to the upstream's host, `www.gogoffcc.com`.
3. **Sub-path deployment.** The app lives at `https://www.gogoffcc.com/gogoffcc-pmm`. Next.js's `basePath` is baked in at build time via the `NEXT_PUBLIC_BASE_PATH` build arg.
4. **One nginx layer on our side, one location block.** Unlike a split frontend/API deployment, PMM's Next.js API routes ARE the backend — there is no separate API process or port. Upstream nginx (colleague) terminates TLS and forwards `/gogoffcc-pmm/*` to our server's port 80. Our **host nginx** holds a single location block that strips the `/gogoffcc-pmm` prefix and proxies into the one Docker container on `127.0.0.1:3001`.
5. **Coordination is minimal.** The upstream colleague just adds `/gogoffcc-pmm/*` → `<our-server>:80`, mirroring the existing `/gogoffcc-pms/` rule. All the path-rewriting logic lives in our host nginx, where we own it.
6. **The container port binds to `127.0.0.1` only**, never `0.0.0.0` — host nginx is the only thing that can reach it.
7. **SQLite runs inside the container**, not as a separate service. There is no `db` container and no database server to provision — the database is a single file (`/app/data/pmm.db`) inside the `pmm-data` Docker volume. This means the go-live steps in this guide skip several things a Postgres/MySQL-backed app would need: no database credentials to generate, no network policy between services, no separate backup tool to install (see §10 for the SQLite-specific approach).
8. **Migrations and seeding run automatically, every start.** `scripts/docker-entrypoint.sh` runs `migrate.mjs` then `seed.mjs` before starting the Next.js server, on every container start — not just the first one. Both scripts are idempotent (migrations are tracked in a `__migrations` table; seeding is skipped once the `users` table has any rows), so there is no manual migration step to remember on upgrade, unlike a typical Alembic/Django-migrations workflow.

---

## 0. Prerequisites

- A server / VM with Docker ≥ 24 and Docker Compose v2
- An **internal IP / hostname** reachable from the upstream reverse proxy (e.g., a private LAN address, a VPC peer, or `127.0.0.1` if upstream runs on the same box)
- Coordination with whoever runs the upstream proxy (`www.gogoffcc.com`) — you'll hand them one line (see §7)
- Ability to run `openssl rand -base64 32` (for generating `NEXTAUTH_SECRET`)

> **What you do NOT need:** your own public domain, a TLS certificate, Caddy/certbot, ports 80/443 open to the internet, DNS records, or a separate database server. SQLite ships inside the app container and persists in a Docker volume — there is nothing else to provision.

---

## 1. Clone the repo onto the server

```bash
git clone <your-repo-url> ~/personal-material-management
cd ~/personal-material-management
ls   # expect: src/  docs/  docker-compose.prod.yml  .env.production.example  ...
```

> **Path note:** This guide uses `~/personal-material-management`. If your site cloned into a system path like `/opt/personal-material-management` instead, substitute that path in every `cd` below.

### 1.1 Authentication for Bitbucket / GitHub clones

Both Bitbucket and GitHub stopped accepting account passwords for git over HTTPS. Use one of the following:

**Bitbucket — API token** (the replacement for App Passwords, which Atlassian deprecated on 2025-09-09):
- Generate the token in Atlassian account settings → Security → **API tokens** → scope it to `Bitbucket: repositories: read` for the target repo
- At the `git clone` prompt:
  - **Username**: your Atlassian account email
  - **Password**: paste the API token

**GitHub — Personal Access Token (fine-grained)**:
- GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → grant `Contents: Read-only` on the target repo
- At the `git clone` prompt:
  - **Username**: your GitHub username
  - **Password**: paste the PAT

**Either platform — SSH deploy key** (cleanest long-term, no expiry, no token rotation):
- `ssh-keygen -t ed25519 -C "<server-name> deploy" -f ~/.ssh/<remote>_deploy` (no passphrase for unattended pulls)
- Paste `~/.ssh/<remote>_deploy.pub` into the repo's **Access keys** settings (Bitbucket) or **Deploy keys** (GitHub), read-only
- Add to `~/.ssh/config`:
  ```
  Host bitbucket.org    # or github.com
      User git
      IdentityFile ~/.ssh/<remote>_deploy
      IdentitiesOnly yes
  ```
- Clone via SSH URL: `git clone git@bitbucket.org:<workspace>/<repo>.git ...`

**Optional**: to avoid re-pasting the HTTPS token on every `git pull`:
```bash
git config --global credential.helper store
git pull   # paste token once; stored cleartext in ~/.git-credentials thereafter
```
Only use `store` on a server you alone have shell access to.

---

## 2. Pre-deploy port check

The container publishes on host port `3001` by default (override with `PMM_HOST_PORT` in `.env` if it's taken):

```bash
sudo ss -tlnp | grep ':3001'   # no output = free; if taken, set PMM_HOST_PORT in .env
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

If port `3001` is already bound by another process or container, pick a free port and set `PMM_HOST_PORT=<port>` in `.env` in the next step — nothing else needs to change (the container-side port stays `3000`).

---

## 3. Secrets & env

The repo ships one template file at the root: `.env.production.example`. Copy it, then fill in real values.

```bash
openssl rand -base64 32   # → paste as NEXTAUTH_SECRET below
```

```bash
cp .env.production.example .env
chmod 600 .env
```

Then edit `.env`:

| Variable | Value to set |
|---|---|
| `PMM_HOST_PORT` | `3001` unless the port check in §2 found it taken, in which case set it to a free port |
| `AUTH_URL` | `https://www.gogoffcc.com/gogoffcc-pmm/api/auth` — the public auth endpoint: upstream host + prefix + `/api/auth`. Must match the prefix exactly (see the troubleshooting table in §13 for what happens when it doesn't) |
| `NEXTAUTH_SECRET` | Paste the `openssl rand -base64 32` value generated above |
| `ADMIN_INITIAL_PASSWORD` | A strong password for the first-boot admin account (`admin@pmm.local`). Change it in the app after first login anyway |

> `SEED_SAMPLE_DATA=false` is already hardcoded in `docker-compose.prod.yml` — it is not a variable you set in `.env`. Production always seeds the admin user only, never the sample categories/locations/items that the dev seed creates.

---

## 4. Build & start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes a few minutes. On first boot the entrypoint auto-runs migrations, then seeds the admin-only user (see topology note 8 above — this happens on every restart too, but is a no-op once applied/seeded).

Verify with the logs:

```bash
docker compose -f docker-compose.prod.yml logs --tail 50
```

Expect to see:
- `--- Running database migrations ---` followed by `[ok]   0000_xxx.sql`-style lines (or `All migrations already applied.` on a restart)
- `--- Seeding sample data (skipped if already seeded) ---` followed by `SEED_SAMPLE_DATA=false — skipping sample data. Admin user only.` (or `Database already seeded. Skipping.` on a restart)
- `--- Starting Next.js server ---`

Also confirm the container is up:

```bash
docker compose -f docker-compose.prod.yml ps
```

`pmm` should show `Up`.

---

## 5. Timezone check

```bash
docker compose -f docker-compose.prod.yml exec pmm date
```

Must show `+0800` (Taiwan time — set via `TZ: Asia/Taipei` in `docker-compose.prod.yml`, honored because the image installs `tzdata`). If it shows UTC, the image build didn't pick up `tzdata` — rebuild with `--build`.

---

## 6. Host nginx

If nginx isn't installed on the server yet: `sudo apt install -y nginx`.

### 6.1 Add a new location block

Append the following inside the existing `server { ... }` block in `/etc/nginx/sites-enabled/default` (right next to the existing `/gogoffcc-pms/` block):

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

This is a single block, unlike a split frontend/API deployment — PMM's Next.js API routes are served by the same process on the same port, so there is nothing else to route.

Validate and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

> **Next.js 16 basePath note — why this block strips the prefix.** In Next.js ≤15, `basePath` made the server *require* the prefix on incoming requests, so the proxy had to preserve it. **Next.js 16 changed this**: `basePath` only affects URL/asset *generation* in the bundle; the server still serves routes at unprefixed paths (`/login`, `/dashboard`, `/_next/...`). Verified empirically: `curl 127.0.0.1:3001/login` → 200, `curl 127.0.0.1:3001/gogoffcc-pmm/login` → 404. So the host nginx must strip the prefix — the trailing-slash `proxy_pass` form does that. The browser-side URLs still all carry `/gogoffcc-pmm` because the prefix is baked into the generated HTML/JS by the `NEXT_PUBLIC_BASE_PATH` build arg.

---

## 7. Upstream ask

Hand the upstream operator this one-line ask:

> Please add a location block for `/gogoffcc-pmm/` that mirrors the existing `/gogoffcc-pms/` one — same target (`<our-server-ip>:80`), same TLS / `X-Forwarded-*` headers. All path rewriting is handled internally on our side.

No strip/preserve split is needed at the upstream layer because our host nginx does it.

---

## 8. Local smoke test before involving upstream

Once the host nginx reload succeeds, prove the host-nginx → container path works without waiting on the upstream:

```bash
curl -I  http://127.0.0.1:3001/login                                  # direct: 200 (unprefixed)
curl -s  http://127.0.0.1:3001/login | grep -o 'gogoffcc-pmm' | head -1   # assets carry prefix
curl -I -H 'Host: www.gogoffcc.com' -H 'X-Forwarded-Proto: https' \
     http://127.0.0.1/gogoffcc-pmm/login                              # through host nginx: 200
```

If all three succeed, host nginx + container are wired correctly. Only the upstream-colleague step (§7) remains before the public URL works.

---

## 9. Public smoke-test matrix

Run this once after the upstream operator has reloaded their proxy, before announcing the URL to users. Substitute `<HOST>` = `www.gogoffcc.com` and `<PREFIX>` = `/gogoffcc-pmm`.

| # | Step | Pass criterion |
|---|------|----------------|
| 1 | Browse to `https://<HOST><PREFIX>/login` | Login page renders. No 404. URL bar still shows the prefix. |
| 2 | DevTools → Network → reload the page | All `_next/static/*` requests are under `<PREFIX>/_next/...` and return 200. Zero requests hit the root `/_next/...`. |
| 3 | Submit the login form with admin credentials | POST to `<PREFIX>/api/auth/callback/credentials` returns 302 and lands on `<PREFIX>/dashboard`. |
| 4 | Browse the items list | `<PREFIX>/api/items` returns 200 and items render. |
| 5 | Open the barcode scanner (`<PREFIX>/scan`) | Camera permission prompt appears and the video feed starts. This requires a secure origin — it only works because the browser sees `https://<HOST>`, even though the container itself speaks plain HTTP. If the upstream ever serves this app over plain HTTP, `html5-qrcode`'s camera access will silently fail. |
| 6 | Switch language (header language switcher) | UI text changes; reload the page — the choice persists via the `NEXT_LOCALE` cookie. |
| 7 | Log out | Redirected to `<PREFIX>/login`, still under the prefix. |

---

## 10. Backups

The SQLite database (`/app/data/pmm.db` inside the `pmm-data` volume) is the only stateful piece for this app. It runs in WAL mode, so a raw file copy of a live database is **not** crash-consistent — you can copy a torn write mid-transaction. There is also no `sqlite3` CLI in the production image (the `node:20-alpine` runtime image only carries what the app needs at runtime). Instead, use better-sqlite3's own online backup API, invoked as a one-liner inside the container:

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

```bash
sudo chmod +x /etc/cron.daily/pmm-backup
# Test it once right away:
sudo /etc/cron.daily/pmm-backup && ls -la /var/backups/pmm/
```

> The `-T` flag on `exec` matters — it disables the pseudo-TTY, which would otherwise interfere with piping and cron's non-interactive execution. `db.backup()` uses SQLite's own online backup API, which safely copies a live database (including in-flight WAL pages) into a consistent snapshot file — this is the correct SQLite equivalent of `pg_dump` or `mysqldump`, not a `cp` of the `.db` file.

**Restore**: stop the stack, replace `/app/data/pmm.db` inside the `pmm-data` volume with the decompressed backup file, then start the stack again. The entrypoint re-runs migrations and seeding on the next start, but both are no-ops against a restored database that already has tables and users, so this is safe.

```bash
docker compose -f docker-compose.prod.yml down
gunzip -c /var/backups/pmm/pmm-<date>.db.gz > /tmp/pmm-restore.db

# Find the actual volume name (compose prefixes it with the project name,
# which defaults to the clone directory's basename — confirm rather than assume):
docker volume ls | grep pmm-data

docker run --rm -v <volume-name-from-above>:/data -v /tmp:/restore alpine \
    cp /restore/pmm-restore.db /data/pmm.db
docker compose -f docker-compose.prod.yml up -d
```

Test restore periodically — a backup you haven't tested is not a backup.

---

## 11. Upgrades

Run on the production host:

```bash
cd ~/personal-material-management
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

What each step does:

1. **`git pull`** — fetch the latest code.
2. **`up -d --build`** — rebuild the image and roll the container.
   - ⚠️ `NEXT_PUBLIC_BASE_PATH` is baked into the frontend bundle **and passed as a Docker build arg** (`docker-compose.prod.yml` sets it to `/gogoffcc-pmm`), so it is fixed at build time — there is no runtime env var that can override it after the image is built.
   - Migrations and seeding run automatically as the container starts (see topology note 8) — there is no separate `alembic upgrade head`-style command to run by hand.
   - Builds are reproducible: `package.json` pins `packageManager: "pnpm@10.33.2"`, which Docker's `corepack enable pnpm` step in the Dockerfile picks up automatically, so the same pnpm version (and therefore the same lockfile resolution behavior) is used on every build regardless of what's installed on the host.

### Speed tips

- Tail logs to confirm a clean start: `docker compose -f docker-compose.prod.yml logs -f --tail 50`

### Rollback

```bash
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

Migrations are forward-only. If the release you're rolling back from contained a schema migration, restore the DB from backup (§10) before rolling back the code — the older code may not understand the newer schema.

---

## 12. Go-live checklist

- [ ] `NEXTAUTH_SECRET` is 32+ random bytes from `openssl rand -base64 32`, not blank or a placeholder
- [ ] `ADMIN_INITIAL_PASSWORD` is strong, not the `admin123` dev default
- [ ] `.env` is `chmod 600` and **not committed** (confirm with `git status` / `.gitignore`)
- [ ] Port `3001` (or the `PMM_HOST_PORT` you chose) is free, per the check in §2
- [ ] `SEED_SAMPLE_DATA=false` confirmed via the boot logs (`Admin user only.` line, not the sample categories/items log)
- [ ] Admin password changed away from the bootstrap value after first login
- [ ] Host nginx strip rule is live (`sudo nginx -t` passed, reloaded) and the upstream operator has added the `/gogoffcc-pmm/` forward rule
- [ ] Public smoke-test matrix (§9) is green, including the camera check on a real HTTPS URL
- [ ] Backup cron (§10) is installed and at least one run has been verified
- [ ] `docker compose ps` shows the `pmm` service healthy after a reboot (`restart: unless-stopped` is already set in the compose file)
- [ ] Container clock shows `+0800` (§5)

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Assets 404 under the prefix (`<PREFIX>/_next/...` returns 404) | `NEXT_PUBLIC_BASE_PATH` build arg missing or wrong at image build time | Confirm `docker-compose.prod.yml` sets `NEXT_PUBLIC_BASE_PATH: /gogoffcc-pmm` under `build.args`, then rebuild: `up -d --build` |
| Redirect lands on `/login` without the prefix | Host nginx proxy fix (trailing-slash strip) missing, or an old image without the `basePath`-aware redirect logic is still running | Confirm the `location /gogoffcc-pmm/` block uses `proxy_pass http://127.0.0.1:3001/;` (trailing slash); rebuild the image if it predates the base-path-aware `proxy.ts` redirects |
| Auth error mentioning `UntrustedHost` | `trustHost` not honored, or `AUTH_URL` wrong | `auth.config.ts` sets `trustHost: true` — confirm the running image is current; check `AUTH_URL` in `.env` matches `https://www.gogoffcc.com/gogoffcc-pmm/api/auth` exactly |
| Login loop (form submits, lands back on login) | `AUTH_URL` path does not match the actual deployed prefix | Fix `AUTH_URL` in `.env`, `docker compose -f docker-compose.prod.yml up -d` (no rebuild needed — this is a runtime env var, not a build arg) |
| `<PREFIX>/api/...` returns 404 through the upstream but 200 when hit directly on `127.0.0.1:3001` | Host nginx strip rule (trailing slash on `proxy_pass`) missing from the single location block | Confirm `proxy_pass http://127.0.0.1:3001/;` has the trailing slash; `sudo nginx -t && sudo systemctl reload nginx` |
| Barcode scanner camera never activates | Not on an HTTPS origin | Confirm the browser URL bar shows `https://www.gogoffcc.com/...`, not `http://`; camera access requires a secure origin and silently fails otherwise |
| Sample items (Electronics, Warehouse A, etc.) appear in production | `SEED_SAMPLE_DATA` was unset (defaults to seeding samples) the first time the container ever started against this volume | The volume is already seeded — `seed.mjs` is a no-op on subsequent starts even after fixing the env var. Clean up the sample rows via the admin UI, or (if no real data exists yet) `docker compose -f docker-compose.prod.yml down -v` to reset the volume and restart with `SEED_SAMPLE_DATA=false` correctly set (already the compose default — check for a stray `.env` override) |

---
