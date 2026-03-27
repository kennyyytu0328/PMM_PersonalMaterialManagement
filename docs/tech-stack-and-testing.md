# PMM — Tech Stack & Manual Testing Guide

## Tech Stack

### Core Framework

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.2.1 | Full-stack React framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type safety |

### Database

| Technology | Version | Purpose |
|-----------|---------|---------|
| SQLite | (via better-sqlite3) | Lightweight file-based database |
| better-sqlite3 | 12.8.0 | Node.js SQLite driver |
| Drizzle ORM | 0.45.1 | Type-safe ORM with migrations |
| Drizzle Kit | 0.31.10 | Migration generation and management |

### Authentication

| Technology | Version | Purpose |
|-----------|---------|---------|
| NextAuth.js | 5.0.0-beta.30 | Credentials-based auth with JWT sessions |
| bcryptjs | 3.0.3 | Password hashing |

### Styling & UI

| Technology | Version | Purpose |
|-----------|---------|---------|
| Tailwind CSS | 4.x | Utility-first CSS framework |
| Lucide React | 1.7.0 | Icon library |
| clsx + tailwind-merge | 2.1.1 / 3.5.0 | Conditional class merging |

### Features

| Technology | Version | Purpose |
|-----------|---------|---------|
| html5-qrcode | 2.3.8 | Barcode scanning via phone camera |
| Recharts | 3.8.1 | Charts for reports |
| Zod | 4.3.6 | Input validation schemas |

### Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vitest | 4.1.2 | Test runner |
| Testing Library (React) | 16.3.2 | Component testing utilities |
| jsdom | 29.0.1 | Browser environment for tests |

### Deployment

| Technology | Purpose |
|-----------|---------|
| Docker (node:20-alpine) | Containerized deployment |
| Docker Compose | Service orchestration |
| Next.js Standalone Output | Minimal production image |

---

## Project Structure Overview

```
src/
  app/
    (auth)/login/           — Login page
    (main)/                 — Authenticated pages (with bottom nav)
      dashboard/            — Home with stats & activity
      items/                — Item list, detail, create, edit
      scan/                 — Barcode scanner
      activity/             — Transaction history
      reports/              — Charts & summaries
      admin/
        categories/         — Category management (admin)
        locations/          — Location management (admin)
        users/              — User management (admin)
    api/                    — REST API endpoints
      auth/                 — NextAuth + registration
      items/                — Item CRUD
      transactions/         — Stock in/out/adjust
      checkouts/            — Check-in/check-out
      categories/           — Category CRUD
      locations/            — Location CRUD
      users/                — User CRUD
      scan/                 — Barcode lookup
      reports/              — Report data
  components/
    ui/                     — Shared UI (Button, Input, Modal, Toast, etc.)
    layout/                 — Bottom nav, header
    items/                  — Item-specific components
    scanner/                — Barcode scanner wrapper
    reports/                — Stat card, stock chart
    activity/               — Activity feed item
  db/
    schema.ts               — Drizzle table definitions
    index.ts                — Database connection
    migrations/             — SQL migration files
  lib/
    auth.ts                 — NextAuth configuration
    validations.ts          — Zod schemas
    sku.ts                  — SKU auto-generator
    utils.ts                — Helpers (cn, formatCurrency, formatDate)
```

---

## Manual Testing Guide

### Prerequisites

```bash
cd D:/MyWorkData/WebApp_Tools/Personal_Material_Management
pnpm db:migrate    # Apply database migrations
pnpm seed          # Seed sample data
pnpm dev           # Start dev server at http://localhost:3000
```

### Default Login

- **Email:** admin@pmm.local
- **Password:** admin123

---

### 1. Login Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open http://localhost:3000 | Redirected to /login |
| 2 | Enter wrong password, click Sign In | "Invalid email or password" error shown |
| 3 | Enter admin@pmm.local / admin123, click Sign In | Redirected to /dashboard |
| 4 | Click user icon (top right), click Sign Out | Redirected to /login |

### 2. Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in and land on /dashboard | See 4 stat cards: Total Items (8), Low Stock (1), Checked Out (0), Inventory Value |
| 2 | Scroll down | See recent activity feed with stock transactions |

### 3. Items — Browse & Search

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap "Items" in bottom nav | See list of 8 seeded items |
| 2 | Type "USB" in search box | List filters to show only USB-C Cable |
| 3 | Clear search, tap filter icon | Category/Location/Low Stock filters appear |
| 4 | Select "Cables" category | Only USB-C Cable and HDMI Cable shown |
| 5 | Toggle "Low Stock" filter | Only Sticky Notes shown (quantity 2, min 5) |

### 4. Items — Create New Item

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On items page, tap "+ Add" button | Navigate to /items/new |
| 2 | Fill in: Name="Test Item", Unit="pcs", Quantity=10 | Form accepts input |
| 3 | Select a category and location | Dropdowns show seeded categories/locations |
| 4 | Tap "Create Item" | Toast: "Item created", redirected to items list |
| 5 | Search for "Test Item" | New item appears with SKU PMM-00009 |

### 5. Items — Stock In/Out

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap any item to open detail page | See item info, quantity, action buttons |
| 2 | Tap "Stock In" | Modal opens with quantity + note fields |
| 3 | Enter quantity=5, note="Restocked", tap "Stock In" | Toast: "Stock added successfully", quantity increases by 5 |
| 4 | Tap "Stock Out" | Modal opens |
| 5 | Enter quantity=2, tap "Stock Out" | Toast: "Stock removed successfully", quantity decreases by 2 |
| 6 | Try Stock Out with quantity larger than current stock | Error: "Insufficient stock" |
| 7 | Scroll down on detail page | See transaction history showing your actions |

### 6. Items — Check Out / Return

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On item detail, tap "Check Out" | Modal with user select, quantity, due date, note |
| 2 | Select "Admin" user, quantity=1, tap "Check Out" | Toast: "Item checked out", quantity decreases, checkout appears in Active Checkouts section |
| 3 | Tap "Return" on the active checkout | Toast: "Item returned", quantity restored |

### 7. Items — Edit & Delete

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On item detail, tap edit icon (pencil) | Navigate to edit page with form pre-filled |
| 2 | Change name, tap "Update Item" | Toast: "Item updated", redirected back |
| 3 | On item detail, tap delete icon (trash) | Confirm dialog appears |
| 4 | Confirm deletion | Toast: "Item deleted", redirected to items list |

### 8. Barcode Scanner

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap "Scan" (center button in bottom nav) | Camera viewfinder opens (requires HTTPS or localhost) |
| 2 | Scan a barcode that matches seeded data (e.g., UPC 012345678905) | Item found: shows USB-C Cable with "View Details" button |
| 3 | Scan an unknown barcode | "Barcode not found" with "Add as New Item" button |
| 4 | Tap "Add as New Item" | Navigates to /items/new with barcode pre-filled |

**Note:** Barcode scanning requires camera access. On mobile, access via phone browser at your dev machine's IP (e.g., http://192.168.x.x:3000). Camera permission must be granted. Some browsers require HTTPS for camera access except on localhost.

### 9. Activity Log

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap "Activity" in bottom nav | See all transactions in chronological order |
| 2 | Scroll to bottom | "Load More" button appears if more than 50 entries |

### 10. Reports

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap "Reports" in bottom nav | See summary stats, stock movement chart, low stock items |
| 2 | Check stat cards | Total Items, Inventory Value, Low Stock count, Checked Out count |
| 3 | Check stock movement chart | Bar chart showing IN/OUT transactions by date |
| 4 | Check low stock section | Sticky Notes shown (2/5 = below minimum) |
| 5 | Check category breakdown | Items grouped by category with counts |

### 11. Admin — Categories

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tap user icon > "Admin Settings" | Navigate to admin area |
| 2 | Go to /admin/categories | See 4 seeded categories |
| 3 | Tap "+ Add", enter "Furniture", tap Create | New category appears in list |
| 4 | Tap edit icon on a category | Modal opens pre-filled, can update |
| 5 | Tap delete icon, confirm | Category removed |

### 12. Admin — Locations

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to /admin/locations | See 4 seeded locations |
| 2 | Add, edit, delete same as categories | CRUD operations work |

### 13. Admin — Users

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to /admin/users | See admin user with "admin" badge |
| 2 | Tap "+ Add", fill in name/email/password, select role "staff" | New user created with "staff" badge |
| 3 | Log out, log in as the new staff user | Dashboard works, but /admin/* pages redirect to /dashboard |
| 4 | As staff user, try to delete items | Delete button not shown (admin only) |
| 5 | Log back in as admin | Full access restored |

### 14. Role-Based Access

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Admin** | Everything | — |
| **Staff** | Browse, create/edit items, stock in/out, checkout, scan, reports | Delete items, manage categories/locations/users |
| **Viewer** | Browse items, search, view reports | Create/edit items, stock operations, checkouts |

---

## Running Tests

```bash
pnpm test           # Run all tests (18 tests)
pnpm test:watch     # Run in watch mode
```

## Docker Deployment

`docker compose up -d` is all you need. The container automatically:
1. Runs database migrations (`scripts/migrate.mjs`) — applies any pending SQL files, idempotent via `__migrations` table.
2. Seeds sample data (`scripts/seed.mjs`) — only runs if the `users` table is empty.
3. Starts the Next.js production server.

### Quick Start

```bash
# Build image and start container in the background
docker compose up -d

# Access the app at http://localhost:3000
# Login: admin@pmm.local / admin123
```

### Common Commands

```bash
# View live logs (including migration/seed output on first boot)
docker compose logs -f pmm

# Stop the container (data volume is preserved)
docker compose down

# Stop and remove volumes (WARNING: destroys all data)
docker compose down -v

# Rebuild the image after code changes
docker compose up -d --build

# Backup the SQLite database
docker cp $(docker compose ps -q pmm):/app/data/pmm.db ./backup-pmm.db
```

### How Auto-Migration Works

The container uses `scripts/docker-entrypoint.sh` as its entrypoint. On every start it:

- Reads `.sql` files from `src/db/migrations/` in alphabetical order.
- Tracks applied migrations in a `__migrations` table inside the database.
- Skips files that have already been applied — safe to restart at any time.
- Uses `better-sqlite3` directly (no drizzle-kit required in the production image).

### Docker Testing Checklist

| Step | Action | Expected |
|------|--------|----------|
| 1 | `docker compose up -d` | Image builds, container starts |
| 2 | `docker compose logs pmm` | See "Applied 1 migration(s)" + "Seeding database..." on first run |
| 3 | Open http://localhost:3000 | Redirected to /login |
| 4 | Login with admin@pmm.local / admin123 | Dashboard loads with 8 items |
| 5 | `docker compose restart pmm` | Logs show "skip" for migrations, "already seeded" for seed |
| 6 | `docker compose down && docker compose up -d` | Data persists (volume kept), logs show "skip" |
| 7 | `docker compose down -v && docker compose up -d` | Fresh start: migrations re-applied, data re-seeded |

## Useful Commands

```bash
pnpm dev             # Start dev server
pnpm build           # Production build
pnpm start           # Start production server
pnpm db:generate     # Generate new migration after schema changes
pnpm db:migrate      # Apply pending migrations
pnpm db:studio       # Open Drizzle Studio (database browser)
pnpm seed            # Seed sample data
pnpm test            # Run tests
```
