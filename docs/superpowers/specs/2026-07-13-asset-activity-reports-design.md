# Design: Asset Info on Activity & Reports Pages

**Date:** 2026-07-13
**Status:** Approved
**Branch:** feature/asset-management

## Problem

The Activity page (`/activity`) and Reports page (`/reports`) only cover the
quantity-based items side of the system. Asset lifecycle events (`assetEvents`)
and asset statistics are invisible outside the per-asset detail page, the
dashboard stat cards, and the scrap-approvals admin page.

## Decisions (user-confirmed)

1. **Activity UI:** Tabs (Items | Assets) — two separate lists, each with its
   own pagination. Not a merged feed.
2. **Reports scope:** Asset stat cards + status breakdown. No custodian
   distribution or scrap trend charts.
3. **Asset value stat:** Show both — active value (excluding `scrapped` and
   `lost`) as the main number, total acquisition cost as the sub-line.
4. **API approach:** Dedicated `GET /api/asset-events` endpoint plus a new
   `type=asset-summary` branch in the existing `/api/reports` route
   (Approach A). No piggybacking on `/api/transactions`, no unified
   `/api/activity` endpoint.

## 1. API: `GET /api/asset-events`

New route file `src/app/api/asset-events/route.ts`, mirroring the GET handler
of `src/app/api/transactions/route.ts`:

- **Auth:** `auth()` session required; 401 `{ success: false, error: 'Unauthorized' }` otherwise.
- **Methods:** GET only. Asset events are created exclusively by existing
  asset mutation flows (register, transfer, status change, scrap flow) — no POST.
- **Query params:**
  - `page` — default 1, min 1
  - `limit` — default 20, min 1, max 100
  - `assetId` — optional, filters by asset
  - `type` — optional, must be one of `REGISTER | TRANSFER | STATUS_CHANGE |
    SCRAP_REQUESTED | SCRAP_APPROVED | SCRAP_REJECTED` (ignored if invalid)
- **Query:** `db.query.assetEvents.findMany` with relations (all already
  defined in `schema.ts` `assetEventsRelations` — verified, no schema change):
  - `asset` (name, assetNo for display; row links to `/assets/{id}`)
  - `fromCustodian`, `toCustodian` (people)
  - `performer` (users — safe columns only: `id, name, email, role, createdAt`;
    never `passwordHash`)
  - ordered `desc(assetEvents.createdAt)`, plus `count()` total in a
    `Promise.all` for meta.
- **Response:** `{ success: true, data: AssetEvent[], meta: { total, page, limit, totalPages } }`.
- **Errors:** try/catch → 500 `{ success: false, error: 'Failed to fetch asset events' }`.

## 2. API: `type=asset-summary` in `/api/reports`

New branch in `src/app/api/reports/route.ts`, single `Promise.all`:

```
{
  totalAssets: number        // count(*) of assets, all statuses
  activeValue: number        // SUM(cost) WHERE status NOT IN ('scrapped','lost'), null cost = 0
  totalValue: number         // SUM(cost) all assets
  inUse: number              // count WHERE status = 'in_use'
  pendingScrap: number       // count(scrapRequests) WHERE status = 'pending'
  byStatus: Array<{ status: string; count: number }>  // GROUP BY status
}
```

`byStatus` only returns statuses present in the DB; the client zero-fills the
full 6-status list (`idle, in_use, repair, lent_out, lost, scrapped`) so all
rows always render.

## 3. Activity page: tabs

`src/app/(main)/activity/page.tsx`:

- Local `useState<'items' | 'assets'>` tab switch — button styling matches
  `AdminTabs` (active: `border-b-2 border-blue-600 text-blue-600`), but plain
  buttons, no routing/URL change. Icons: `Package` (Items), `Monitor` (Assets)
  from lucide-react.
- **Items tab:** current transaction list, logic unchanged.
- **Assets tab:** lazy — fetch `/api/asset-events?page=1&limit=50` on first
  activation only; same "Load More" pagination pattern as the transactions list.
- **Asset event row** (new component `src/components/activity/asset-event-row.tsx`):
  - Type badge — labels reuse `assetDetail.events.*`; variants:
    `REGISTER: info`, `TRANSFER: info`, `STATUS_CHANGE: default`,
    `SCRAP_REQUESTED: warning`, `SCRAP_APPROVED: danger`, `SCRAP_REJECTED: default`
  - Asset name + assetNo (fallback `activity.unknownAsset`)
  - Context line: TRANSFER → `{fromCustodian ?? none} → {toCustodian}`;
    STATUS_CHANGE → localized `{fromStatus} → {toStatus}` via `assets.status.*`
  - Note (if present), then `by {performer} · {formatDate(createdAt)}`
  - Whole row wrapped in `<Link href={/assets/${assetId}}>`
- The row component lives in `asset-event-row.tsx`; the tab state and the
  asset-events fetch/pagination state stay in the page file (mirroring how the
  transactions list is managed today). Page file stays under 400 lines.
- Empty state: `activity.noAssetEvents` / `noAssetEventsDesc` with a `Monitor` icon.

## 4. Reports page: asset section

`src/app/(main)/reports/page.tsx` + new `src/components/reports/asset-stats.tsx`:

- Fetch `/api/reports?type=asset-summary` inside the existing `Promise.all`.
- New section appended below the category card, heading `reports.assetsTitle`:
  - 4 stat cards (reuse the page's `StatCard`, moved/exported as needed):
    1. Total assets — `totalAssets`
    2. Asset value — `formatCurrency(activeValue)` main,
       sub `assetValueSub` = "of {total} total" with `formatCurrency(totalValue)`
    3. In use — `inUse`
    4. Pending scrap — `pendingScrap`, `highlight` when > 0
  - "By status" card: one row per status (all 6, zero-filled) with
    `AssetStatusBadge`, count, and a proportional bar (plain div width
    percentage of max count — no chart library).
- If the asset-summary fetch fails, the asset section is omitted (same
  null-guard pattern the page already uses for `summary`).

## 5. i18n

Add to BOTH `messages/en.json` and `messages/zh-TW.json`:

- `activity`: `tabItems`, `tabAssets`, `noAssetEvents`, `noAssetEventsDesc`,
  `unknownAsset`
- `reports`: `assetsTitle`, `byStatus`; under `reports.stats`: `totalAssets`,
  `assetValue`, `assetValueSub` ("of {total} total"), `assetsInUse`,
  `pendingScrap`

Reused existing keys: `assetDetail.events.*` (event type labels),
`assets.status.*` (status labels).

## 6. Testing (Vitest, existing `__tests__/api/` pattern)

- `/api/asset-events`: 401 without session; returns events with correct
  relation shape (asset, custodians, performer w/o passwordHash); pagination
  meta correct; `type` filter works; invalid `type` ignored.
- `/api/reports?type=asset-summary`: seeded assets incl. scrapped + lost →
  `activeValue` excludes them, `totalValue` includes them; `inUse` and
  `byStatus` counts correct; `pendingScrap` counts only pending requests.
- UI verified manually in browser (dev-flow Step 4).

## Out of Scope

- Refactoring the dashboard to reuse `type=asset-summary` (it currently probes
  `/api/assets?limit=1` counts) — possible follow-up.
- Merged unified activity feed.
- Custodian distribution / scrap trend analytics.
- Localizing server-side error strings.
