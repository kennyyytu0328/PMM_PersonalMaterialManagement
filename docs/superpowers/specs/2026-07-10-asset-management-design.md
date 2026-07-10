# Asset Management Module — Design

**Date:** 2026-07-10
**Status:** Approved (pending user review of this document)

## Goal

Extend PMM into a hybrid inventory + asset management system. Existing quantity-based
items continue to serve consumables. A new **asset** concept covers durable equipment
tracked per unit, supporting three core functions:

- **財產入帳** — register an asset with acquisition details and a unique asset number
- **換人使用** — transfer custody of an asset from one person to another
- **報廢除帳** — scrap/write-off an asset through a request + approval workflow

## Decisions Made

| Question | Decision |
|---|---|
| New project vs. extend PMM | Extend PMM (reuse auth, admin, scanning, i18n, deployment) |
| Asset model | Hybrid: standalone `assets` table alongside quantity-based `items` |
| Structure | Assets independent of items; reuse `categories` and `locations` |
| Custodian (保管人) | Separate admin-managed `people` registry; no login account required |
| Lifecycle | Full: 在庫 idle / 使用中 in_use / 維修中 repair / 外借 lent_out / 遺失 lost / 已報廢 scrapped |
| Asset number (財產編號) | Auto-generated (`AST-YYYY-NNNN`) with manual override |
| 報廢除帳 flow | Request + approve: staff/admin requests, admin approves/rejects |
| 換人使用 flow | Direct action by staff/admin, event-logged |

## Data Model

All new tables; existing tables are untouched.

### `people` — custodian registry

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| name | text NOT NULL | |
| department | text | optional |
| email | text | optional |
| isActive | integer (boolean) NOT NULL default 1 | deactivate instead of delete when holding history |
| createdAt | text NOT NULL default now | |

### `assets` — one row per physical asset

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| assetNo | text NOT NULL UNIQUE | 財產編號, auto `AST-YYYY-NNNN` or manual |
| name | text NOT NULL | |
| description | text | |
| categoryId | FK → categories.id | reused |
| locationId | FK → locations.id | reused |
| custodianId | FK → people.id | null when idle |
| status | enum: idle, in_use, repair, lent_out, lost, scrapped | default idle |
| acquiredAt | text (date) | acquisition date |
| cost | real | acquisition cost |
| vendor | text | optional |
| barcode | text | optional, for scan labels |
| imageUrl | text | optional |
| scrappedAt | text | set on scrap approval |
| scrapReason | text | set on scrap approval |
| createdAt / updatedAt | text NOT NULL default now | |

### `assetEvents` — immutable per-asset history

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| assetId | FK → assets.id NOT NULL | |
| type | enum: REGISTER, TRANSFER, STATUS_CHANGE, SCRAP_REQUESTED, SCRAP_APPROVED, SCRAP_REJECTED | |
| fromCustodianId / toCustodianId | FK → people.id | for TRANSFER |
| fromStatus / toStatus | text | for STATUS_CHANGE and scrap events |
| note | text | |
| performedBy | FK → users.id NOT NULL | |
| createdAt | text NOT NULL default now | |

### `scrapRequests` — approval queue

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| assetId | FK → assets.id NOT NULL | |
| reason | text NOT NULL | |
| requestedBy | FK → users.id NOT NULL | |
| status | enum: pending, approved, rejected | default pending |
| reviewedBy | FK → users.id | |
| reviewNote | text | |
| createdAt / reviewedAt | text | |

## Core Flows

### 財產入帳 (Register)

Fill asset form → asset created with status `idle`, or directly `in_use` if a
custodian is selected → `REGISTER` event logged. Asset number auto-generated unless
manually provided; uniqueness enforced.

### 換人使用 (Transfer)

On asset detail page, "Transfer" action → pick new custodian from people list +
optional note → `custodianId` updated (status becomes `in_use` if it was `idle`) →
`TRANSFER` event logged with from/to custodians. Direct action for staff and admin.

### 報廢除帳 (Scrap / Write-off)

1. Staff or admin submits a scrap request with reason → request `pending`, asset
   unchanged, `SCRAP_REQUESTED` event logged.
2. Admin reviews in the admin Scrap Approvals tab:
   - **Approve** → asset status `scrapped`, custodian cleared, `scrappedAt` and
     `scrapReason` recorded, `SCRAP_APPROVED` event logged.
   - **Reject** → asset unchanged, `SCRAP_REJECTED` event logged with review note.
3. Scrapped assets remain queryable forever (除帳 ≠ delete).
4. An asset with a pending request cannot receive a second request, be transferred,
   or have its status changed until the request is resolved.

### Status changes

Direct dropdown action for repair / lent_out / lost / back to idle. Each change is
event-logged (`STATUS_CHANGE`). Scrapped assets cannot change status.

## API

All routes follow existing PMM conventions: `auth()` session check, Zod validation,
`{ success, data?, error?, meta? }` response shape.

| Route | Methods | Notes |
|---|---|---|
| `/api/people` | GET, POST | POST admin-only |
| `/api/people/[id]` | GET, PUT, DELETE | admin-only mutations; DELETE blocked if person has assets — deactivate instead |
| `/api/assets` | GET, POST | GET with filters (status, custodianId, categoryId, locationId, search) + pagination; POST staff/admin |
| `/api/assets/[id]` | GET, PUT | PUT staff/admin; blocked when scrapped or pending scrap |
| `/api/assets/[id]/transfer` | POST | staff/admin; blocked when scrapped or pending scrap |
| `/api/assets/[id]/status` | POST | staff/admin; blocked when scrapped or pending scrap |
| `/api/scrap-requests` | GET, POST | POST staff/admin; one pending request per asset |
| `/api/scrap-requests/[id]/review` | POST | admin-only approve/reject |
| `/api/scan` | (extended) | also match asset `barcode` / `assetNo` → return asset match |

## Pages & UI

- **`/assets`** — list with status/custodian/category filters, search, status badges.
- **`/assets/new`** — 入帳 form (name, assetNo with auto-fill, category, location,
  custodian, acquisition date/cost/vendor, barcode, image).
- **`/assets/[id]`** — detail: all fields, current custodian, status badge, history
  timeline (from assetEvents), actions: Edit / Transfer / Change Status / Request Scrap.
- **`/admin`** — two new tabs: **People** (CRUD + deactivate) and **Scrap Approvals**
  (pending queue with approve/reject, badge count).
- **Dashboard** — asset summary cards: total assets, in use, pending scrap approvals.
- **Navigation** — assets entry point in bottom nav / header.
- **Scanner** — scanning an asset barcode or asset number jumps to asset detail.
- **i18n** — all new strings added to both `messages/en.json` and `messages/zh-TW.json`
  under new namespaces (assets, assetForm, assetDetail, people, scrapRequests, …).

## Permissions

| Action | viewer | staff | admin |
|---|---|---|---|
| View assets / people / history | ✅ | ✅ | ✅ |
| 入帳, edit asset, transfer, status change | — | ✅ | ✅ |
| Submit scrap request | — | ✅ | ✅ |
| Approve/reject scrap | — | — | ✅ |
| Manage people | — | — | ✅ |

Enforced in both the proxy (page access) and each API handler (role check), matching
the existing pattern.

## Error Handling & Guards

- Transfer / edit / status change on a `scrapped` asset → 400 with clear error.
- Second scrap request while one is pending → 400.
- Duplicate `assetNo` → 400 with a clear conflict message.
- Deleting a person who is or was a custodian → 400; deactivate instead.
- Zod validation on every input, client and server.

## Testing

Vitest, following existing `__tests__/` patterns:

- **Unit:** asset number generation (format, sequence, year rollover, manual override),
  Zod schemas for people/assets/scrap requests.
- **Integration (API):** register → transfer → scrap-request → approve happy path;
  guard violations (scrapped asset edit, duplicate pending request, duplicate assetNo);
  permission denials (viewer mutation, staff approving scrap).

## Out of Scope (YAGNI)

- Depreciation calculation / accounting integration
- Linking assets to items as "serialized units"
- Transfer approval workflow (transfers are direct)
- Bulk import of assets (can be added later)
