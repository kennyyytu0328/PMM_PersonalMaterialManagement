# PMM — Manual Testing Guide

A step-by-step walkthrough for manually verifying every feature of the Personal Material Management app.

---

## 1. Setup

### Option A — Local dev (recommended for development)

```bash
cd D:/MyWorkData/WebApp_Tools/Personal_Material_Management
pnpm install
pnpm db:migrate     # Create SQLite schema
pnpm seed           # Load sample data (admin + 8 items)
pnpm dev            # http://localhost:3000
```

### Option B — Docker (production-like)

```bash
docker compose up -d                 # Auto-migrates + seeds on first boot
docker compose logs -f pmm           # Watch startup logs
```

### Default Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | `admin@pmm.local`  |
| Password | `admin123`         |
| Role     | `admin`            |

### Reset Database (start fresh)

```bash
# Local
rm -rf data/pmm.db data/pmm.db-shm data/pmm.db-wal
pnpm db:migrate && pnpm seed

# Docker
docker compose down -v && docker compose up -d
```

---

## 2. Test Matrix Overview

| # | Area                 | Route                       | Roles        |
|---|----------------------|-----------------------------|--------------|
| 1 | Login / Logout       | `/login`                    | All          |
| 2 | Dashboard            | `/dashboard`                | All          |
| 3 | Items — Browse       | `/items`                    | All          |
| 4 | Items — Create       | `/items/new`                | admin, staff |
| 5 | Items — Stock In/Out | `/items/[id]`               | admin, staff |
| 6 | Checkout / Return    | `/items/[id]`               | admin, staff |
| 7 | Items — Edit/Delete  | `/items/[id]`, edit         | admin        |
| 8 | Barcode Scanner      | `/scan`                     | All          |
| 9 | Activity Log         | `/activity`                 | All          |
| 10 | Reports             | `/reports`                  | All          |
| 11 | Admin — Categories  | `/admin/categories`         | admin        |
| 12 | Admin — Locations   | `/admin/locations`          | admin        |
| 13 | Admin — Users       | `/admin/users`              | admin        |
| 14 | Profile / Password  | `/profile`                  | All          |
| 15 | Role Enforcement    | Proxy + API                 | All          |
| 16 | i18n (en / zh-TW)   | Header language switcher    | All          |

---

## 3. Test Scenarios

### 3.1 Login / Logout

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit `http://localhost:3000` | Redirects to `/login` |
| 2 | Submit `admin@pmm.local` + wrong password | Error: "Invalid email or password" |
| 3 | Submit valid credentials | Redirects to `/dashboard` |
| 4 | Refresh page | Session persists |
| 5 | Click user avatar → Sign Out | Redirects to `/login` |
| 6 | Directly visit `/items` while logged out | Redirects to `/login` |

### 3.2 Dashboard

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in | 4 stat cards: Total Items (8), Low Stock (1), Checked Out (0), Inventory Value |
| 2 | Scroll down | Recent activity feed shows seeded transactions |
| 3 | Click an activity row | Navigates to that item's detail page |

### 3.3 Items — Browse & Filter

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bottom nav → "Items" | List of 8 seeded items |
| 2 | Search "USB" | Only "USB-C Cable" visible |
| 3 | Clear search; open filter panel | Category / Location / Low-stock filters shown |
| 4 | Filter by category "Cables" | Shows "USB-C Cable" + "HDMI Cable" |
| 5 | Toggle "Low Stock" filter | Shows only "Sticky Notes" (qty 2 < min 5) |
| 6 | Reset filters | Full list returns |

### 3.4 Items — Create

| Step | Action | Expected |
|------|--------|----------|
| 1 | Items page → "+ Add" | Navigates to `/items/new` |
| 2 | Submit empty form | Zod validation errors under fields |
| 3 | Fill name "Test Item", unit "pcs", qty 10, pick category + location | Form accepts |
| 4 | Submit | Toast "Item created", redirects to item detail |
| 5 | Back to list; search "Test Item" | Item appears with SKU `PMM-00009` |

### 3.5 Items — Stock In / Out

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open any item detail | Shows qty, SKU, category, location, action buttons |
| 2 | Stock In → qty 5, note "Restock" | Toast success; qty +5 |
| 3 | Stock Out → qty 2 | Toast success; qty -2 |
| 4 | Stock Out with qty > current | Error: "Insufficient stock" |
| 5 | Scroll down detail page | Transaction log lists the new IN/OUT entries |

### 3.6 Checkout / Return

| Step | Action | Expected |
|------|--------|----------|
| 1 | Item detail → "Check Out" | Modal with user / qty / due date / note |
| 2 | Pick "Admin" user, qty 1, submit | Toast; item qty -1; entry in "Active Checkouts" |
| 3 | Click "Return" on the checkout | Toast; qty restored; checkout removed from active list |

### 3.7 Items — Edit / Delete

| Step | Action | Expected |
|------|--------|----------|
| 1 | Detail page → pencil icon | `/items/[id]/edit` opens with values pre-filled |
| 2 | Change name, submit | Toast "Item updated" |
| 3 | Detail page → trash icon | Confirm dialog |
| 4 | Confirm | Toast "Item deleted"; redirects to list |

### 3.8 Barcode Scanner

> Camera requires HTTPS **or** localhost. To test from phone: find your PC's LAN IP, then phone → `http://<ip>:3000` and grant camera permission.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bottom nav center → "Scan" | Camera preview opens |
| 2 | Scan barcode `012345678905` | Finds "USB-C Cable" → View Details |
| 3 | Scan an unknown code | "Barcode not found" + "Add as New Item" |
| 4 | Tap "Add as New Item" | `/items/new` opens with barcode pre-filled |

### 3.9 Activity Log

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bottom nav → "Activity" | Chronological transaction list |
| 2 | After performing Stock In/Out in §3.5 | Newest entries appear at top |
| 3 | Scroll to bottom (if >50 entries) | "Load More" button paginates |

### 3.10 Reports

| Step | Action | Expected |
|------|--------|----------|
| 1 | Bottom nav → "Reports" | Summary cards + chart render |
| 2 | Stat cards | Totals match dashboard |
| 3 | Stock movement chart | IN/OUT bars grouped by date |
| 4 | Low-stock section | "Sticky Notes" listed (2/5) |
| 5 | Category breakdown | Each category shows item count |

### 3.11 Admin — Categories

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit `/admin/categories` as admin | 4 seeded categories |
| 2 | "+ Add" → name "Furniture" → Create | New row appears |
| 3 | Pencil icon → rename → Save | Row updates |
| 4 | Trash icon → confirm | Row removed |
| 5 | Try delete a category still linked to items | Error: cannot delete (FK) |

### 3.12 Admin — Locations

Identical to Categories (§3.11) but under `/admin/locations`.

### 3.13 Admin — Users

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/admin/users` as admin | Admin user listed with role badge |
| 2 | "+ Add" → name/email/password, role=staff | New user appears |
| 3 | Pencil icon → change role to "viewer" → Save | Badge updates |
| 4 | Pencil icon → "Reset Password" field → enter new password → Save | Toast success |
| 5 | Log out; log in as the new user with reset password | Login succeeds |

### 3.14 Profile — Self-Service Password Change

| Step | Action | Expected |
|------|--------|----------|
| 1 | User avatar → "Profile" (`/profile`) | Shows current user info + password form |
| 2 | Submit form with wrong current password | Error: "Current password is incorrect" |
| 3 | Submit with new password < 8 chars | Zod validation error |
| 4 | Submit with mismatched confirm | Error: passwords do not match |
| 5 | Submit valid current + new (8+ chars) + matching confirm | Toast "Password updated" |
| 6 | Sign out; sign in with new password | Success |

### 3.15 Role-Based Access Control

Create one user per role (admin / staff / viewer) via §3.13, then verify:

| Action | Admin | Staff | Viewer |
|--------|:-----:|:-----:|:------:|
| View items / reports / activity | ✅ | ✅ | ✅ |
| Create item | ✅ | ✅ | ❌ |
| Stock In / Out | ✅ | ✅ | ❌ |
| Checkout / Return | ✅ | ✅ | ❌ |
| Edit item | ✅ | ✅ | ❌ |
| Delete item | ✅ | ❌ | ❌ |
| Access `/admin/*` | ✅ | redirect → `/dashboard` | redirect → `/dashboard` |
| Change own password (`/profile`) | ✅ | ✅ | ✅ |

Quick API check for staff/viewer (replace `<token>` or use browser session):

```bash
# Should 403 for non-admin
curl -X DELETE http://localhost:3000/api/items/<id> -H "Cookie: <session>"
```

### 3.16 i18n — Language Switching

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in; header shows **English** in the language dropdown | Default locale is `en` |
| 2 | Dashboard text: "Dashboard", "Inventory overview", stat labels | All in English |
| 3 | Open header language dropdown → pick **繁體中文** | Page refreshes; text switches to Traditional Chinese |
| 4 | Dashboard now shows "儀表板", "庫存總覽", stat labels in Chinese | Translated strings render |
| 5 | Bottom nav labels | "首頁 / 物品 / 掃描 / 動態 / 報表" |
| 6 | Browser DevTools → Application → Cookies | `NEXT_LOCALE=zh-TW` cookie is set |
| 7 | Refresh the page / open new tab | Chinese persists (cookie-based) |
| 8 | Switch back to English | Text reverts; cookie becomes `NEXT_LOCALE=en` |

> **Coverage:** Full UI translation — login, dashboard, items (list/detail/new/edit/filters/cards), stock and checkout modals, activity, reports (including chart legend), admin (users/categories/locations/tabs), profile, scan, toasts and form validation messages. API error strings from the server (e.g., "Insufficient stock") currently fall through as-is; to fully localize those you'd need to return error codes from API routes and map them on the client.

### Extra checks to sweep across all pages when switching language:

| Page | Verify in Chinese |
|------|-------------------|
| Login | 標題、Email、密碼、登入按鈕 |
| Dashboard | 儀表板、4 張統計卡、最近動態 |
| Items list | 搜尋框 placeholder、所有分類/位置、低庫存按鈕、空狀態 |
| Item detail | 入庫/出庫/借出按鈕、借出中、異動紀錄、歸還 |
| Stock In/Out modal | 入庫/出庫標題、數量/備註欄位、確認 |
| Checkout modal | 借出物品、指派給、到期日 |
| New/Edit item | 名稱、描述、條碼、分類、位置、單位成本、建立/更新物品 |
| Activity | 動態標題、類型徽章 (入庫/出庫/調整)、載入更多 |
| Reports | 報表、統計卡、庫存異動圖表 (圖例)、低庫存物品、依分類 |
| Admin tabs | 使用者、分類、位置 |
| Admin users | 角色下拉 (管理員/員工/檢視者)、新增使用者 modal |
| Admin categories/locations | 名稱/描述、新增 modal、刪除確認 |
| Profile | 個人資料、變更密碼、目前/新/確認密碼 |
| Scan | 掃描條碼、啟動相機、找不到物品、新增為新物品 |
| Toasts | 所有成功/錯誤訊息 |

---

## 4. Edge-Case & Error Paths

| Scenario | Expected |
|----------|----------|
| Submit item with negative quantity | Zod error, no DB write |
| Stock Out more than on hand | API returns error; UI toast shows it |
| Delete category/location in use by items | API returns FK error; row unchanged |
| Delete user who has transactions | Should fail gracefully (FK protection) |
| Session expired → click any action | Redirects to `/login` |
| Refresh `/items/new` mid-form | Form resets (no unsaved-draft leak) |
| Concurrent Stock Out from two tabs | Second tab gets "Insufficient stock" when qty drops |

---

## 5. Smoke Test Checklist (5 min)

Run this after every deploy / major change:

- [ ] Login with seeded admin succeeds
- [ ] Dashboard shows 4 stat cards (no "NaN" / no empty)
- [ ] Items list loads all seeded items
- [ ] Create a new item with category + location
- [ ] Stock In +5 then Stock Out -3 on that item
- [ ] Checkout → Return cycle works
- [ ] Activity log shows the operations above
- [ ] Reports page renders chart (no console errors)
- [ ] Admin can create a staff user
- [ ] Self-service password change on `/profile` works
- [ ] Logout works

---

## 6. Automated Test Suite

Run alongside manual testing:

```bash
pnpm test           # Run all Vitest tests
pnpm test:watch     # Watch mode during development
pnpm lint           # ESLint
pnpm build          # Production build (type-checks all code)
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `SQLITE_CANTOPEN` on startup | `data/` folder missing — create it or run `pnpm db:migrate` |
| Login fails with seeded creds | DB wasn't seeded — run `pnpm seed` (idempotent) |
| Camera doesn't open on scanner | Not on localhost/HTTPS, or permission denied in browser |
| `/admin/*` redirects even as admin | Stale JWT — sign out and sign back in |
| Docker container restart loops | Check `docker compose logs pmm` — usually migration SQL error |
| Low-stock filter shows no items | Seed data: only "Sticky Notes" (qty 2 < min 5) triggers it |

---

## 8. Related Docs

- [`docs/tech-stack-and-testing.md`](./tech-stack-and-testing.md) — Tech stack + Docker details
- [`CLAUDE.md`](../CLAUDE.md) — Architecture decisions, project conventions
- [`docs/superpowers/specs/`](./superpowers/specs/) — Design specs for major features
