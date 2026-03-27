# Personal Material Management (PMM) — Design Spec

## Overview

A mobile-first web application for managing physical items across warehouse and office environments. Built for small teams (2-5 people) managing 100-1,000 items. Deployed as a single Docker container with SQLite storage.

## Goals

- Fast, thumb-friendly mobile experience for warehouse/office use
- Track physical items: quantities, locations, who has what
- Barcode scanning via phone camera for quick lookup and stock operations
- Low stock alerts to prevent shortages
- Reports for inventory visibility

## Non-Goals (v1)

- Offline/PWA support (planned for future)
- Multi-location database sync
- Purchase order / supplier management
- Native mobile app

---

## Data Model

### Item

| Field        | Type          | Required | Notes                              |
|-------------|---------------|----------|------------------------------------|
| id          | integer (PK)  | yes      | Auto-increment                     |
| name        | string        | yes      |                                    |
| description | string        | no       |                                    |
| sku         | string        | yes      | Auto-generated (e.g., PMM-00001)   |
| barcode     | string        | no       | UPC/EAN from physical product      |
| category_id | integer (FK)  | no       | References Category                |
| location_id | integer (FK)  | no       | References Location                |
| quantity    | integer       | yes      | Current stock count, default 0     |
| min_quantity| integer       | no       | Low stock threshold                |
| unit_cost   | decimal       | no       | Cost per unit                      |
| unit        | string        | yes      | pcs, kg, box, etc. Default: "pcs"  |
| image_url   | string        | no       | Future: image upload support       |
| created_at  | datetime      | yes      | Auto-set                           |
| updated_at  | datetime      | yes      | Auto-set                           |

### Category

| Field       | Type          | Required | Notes                              |
|------------|---------------|----------|------------------------------------|
| id         | integer (PK)  | yes      | Auto-increment                     |
| name       | string        | yes      |                                    |
| description| string        | no       |                                    |
| parent_id  | integer (FK)  | no       | Self-reference for nesting         |
| created_at | datetime      | yes      | Auto-set                           |

### Location

| Field       | Type          | Required | Notes                              |
|------------|---------------|----------|------------------------------------|
| id         | integer (PK)  | yes      | Auto-increment                     |
| name       | string        | yes      | e.g., "Warehouse Shelf A3"        |
| description| string        | no       |                                    |
| created_at | datetime      | yes      | Auto-set                           |

### Transaction (stock movements)

| Field        | Type          | Required | Notes                              |
|-------------|---------------|----------|------------------------------------|
| id          | integer (PK)  | yes      | Auto-increment                     |
| item_id     | integer (FK)  | yes      | References Item                    |
| type        | enum          | yes      | IN, OUT, ADJUST                    |
| quantity    | integer       | yes      | Positive number                    |
| note        | string        | no       |                                    |
| performed_by| integer (FK)  | yes      | References User                    |
| created_at  | datetime      | yes      | Auto-set                           |

### Checkout (borrowing)

| Field          | Type          | Required | Notes                              |
|---------------|---------------|----------|------------------------------------|
| id            | integer (PK)  | yes      | Auto-increment                     |
| item_id       | integer (FK)  | yes      | References Item                    |
| user_id       | integer (FK)  | yes      | Who checked it out                 |
| quantity      | integer       | yes      | Default 1                          |
| checked_out_at| datetime      | yes      | Auto-set                           |
| due_date      | datetime      | no       |                                    |
| returned_at   | datetime      | no       | Null until returned                |
| note          | string        | no       |                                    |

### User

| Field         | Type          | Required | Notes                              |
|--------------|---------------|----------|------------------------------------|
| id           | integer (PK)  | yes      | Auto-increment                     |
| name         | string        | yes      |                                    |
| email        | string        | yes      | Unique                             |
| password_hash| string        | yes      |                                    |
| role         | enum          | yes      | admin, staff, viewer               |
| created_at   | datetime      | yes      | Auto-set                           |

### Relationships

- Item belongs to Category (optional) and Location (optional)
- Category can self-reference via parent_id (nested categories)
- Transaction references Item and User (performed_by)
- Checkout references Item and User (who borrowed)

---

## Authentication & Authorization

### Auth Method

NextAuth.js with credentials provider (email + password). No OAuth/social login needed for self-hosted team tool.

### Roles

| Role   | Permissions                                                                 |
|--------|-----------------------------------------------------------------------------|
| Admin  | Full access: manage users, items, categories, locations, reports, settings |
| Staff  | Add/edit items, stock in/out, check-in/check-out, scan, view reports       |
| Viewer | Read-only: browse items, search, view reports                               |

### User Management

- First registered user becomes Admin automatically
- Only Admins can create/invite other users
- No public registration (invite-only)

---

## Pages & Navigation

### Bottom Tab Navigation (mobile)

| Tab      | Icon | Page               | Description                              |
|----------|------|--------------------|------------------------------------------|
| Home     | house| /dashboard         | Quick stats + recent activity feed       |
| Items    | box  | /items             | Browse, search, filter all items         |
| Scan     | camera| /scan             | Barcode scanner (center, prominent)      |
| Activity | arrows| /activity         | Transaction history log                  |
| Reports  | chart| /reports           | Charts and summaries                     |

### Additional Pages

| Page                | Path                    | Access        |
|---------------------|-------------------------|---------------|
| Login               | /login                  | Public        |
| Item Detail         | /items/[id]             | All roles     |
| Add Item            | /items/new              | Admin, Staff  |
| Edit Item           | /items/[id]/edit        | Admin, Staff  |
| Manage Categories   | /admin/categories       | Admin         |
| Manage Locations    | /admin/locations        | Admin         |
| Manage Users        | /admin/users            | Admin         |

### Dashboard (Home)

Quick stats cards:
- Total items count
- Low stock items count
- Currently checked out count
- Today's stock movements count

Recent activity feed showing latest transactions and checkouts.

---

## Key Workflows

### Stock In/Out

1. Tap Scan (or navigate to Items, select item)
2. Scan barcode → item found → show item detail
3. Tap "Stock In" or "Stock Out"
4. Enter quantity + optional note
5. Confirm → transaction recorded, item quantity updated
6. If barcode not found → prompt to create new item with barcode pre-filled

### Check-in/Check-out

1. Navigate to item detail → tap "Check Out"
2. Select user, quantity, optional due date
3. Confirm → checkout record created, item quantity decremented
4. To return: item detail → tap "Return" on active checkout → quantity restored

### Barcode Scanning

- Uses phone camera via browser API (`navigator.mediaDevices.getUserMedia`)
- Decoding library: `html5-qrcode` or `zxing-js`
- Supported formats: UPC-A, UPC-E, EAN-13, EAN-8, Code 128, Code 39
- Flow: scan → lookup barcode in DB → found: show item / not found: create new item

### Low Stock Alerts

- Each item has optional `min_quantity` threshold
- Dashboard displays low stock count as a badge
- Items list supports "Low Stock" filter
- Optional: browser push notifications (v1 stretch goal)

---

## Reports

### Available Reports

1. **Inventory Summary** — total items, total inventory value (quantity x unit_cost), breakdown by category/location
2. **Stock Movement** — chart showing stock in/out over time (daily/weekly/monthly)
3. **Low Stock Report** — table of items below min_quantity threshold
4. **Checkout Report** — currently checked out items, overdue items
5. **Activity Log** — filterable transaction history with CSV export

### Report Filters

- Date range
- Category
- Location
- User (who performed the action)

---

## Tech Stack

| Layer      | Technology         | Purpose                               |
|------------|-------------------|---------------------------------------|
| Framework  | Next.js 15        | App Router, API routes, SSR           |
| Language   | TypeScript        | Type safety                           |
| Styling    | Tailwind CSS      | Mobile-first responsive design        |
| Database   | SQLite            | Lightweight, file-based storage       |
| ORM        | Drizzle           | Type-safe queries, migrations         |
| Auth       | NextAuth.js       | Credentials-based authentication      |
| Scanner    | html5-qrcode      | Barcode scanning via camera           |
| Charts     | Recharts          | Report visualizations                 |
| Icons      | Lucide React      | Consistent icon set                   |
| Deployment | Docker            | Single container, portable            |

---

## Project Structure

```
src/
  app/
    (auth)/login/              — login page
    (main)/                    — authenticated layout with bottom nav
      dashboard/               — home/stats
      items/                   — item list, filters
      items/[id]/              — item detail, stock in/out, checkout
      items/new/               — add new item
      scan/                    — barcode scanner
      activity/                — transaction history
      reports/                 — charts and summaries
      admin/
        categories/            — manage categories
        locations/             — manage locations
        users/                 — manage users
    api/
      auth/                    — NextAuth endpoints
      items/                   — item CRUD
      transactions/            — stock in/out
      checkouts/               — check-in/check-out
      categories/              — category CRUD
      locations/               — location CRUD
      reports/                 — report data
      scan/                    — barcode lookup
  components/
    ui/                        — shared UI components
    layout/                    — nav, header, bottom bar
    items/                     — item-specific components
    scanner/                   — barcode scanner component
  db/
    schema.ts                  — Drizzle schema
    index.ts                   — DB connection
    migrations/                — SQL migrations
  lib/
    auth.ts                    — auth config
    utils.ts                   — helpers
    validations.ts             — Zod schemas
Dockerfile
docker-compose.yml
```

---

## Deployment

### Docker Setup

Single container with:
- Node.js Alpine base image
- Next.js standalone output mode (smaller image)
- SQLite database file in a Docker volume

### docker-compose.yml

```yaml
services:
  pmm:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - pmm-data:/app/data
    environment:
      - NEXTAUTH_SECRET=<generated>
      - NEXTAUTH_URL=http://localhost:3000

volumes:
  pmm-data:
```

### Backup

Copy `data/pmm.db` from the Docker volume. SQLite makes backup trivial.

---

## SKU Generation

All items receive an auto-generated SKU in the format `PMM-XXXXX` (e.g., `PMM-00001`). This ensures every item has a unique identifier regardless of whether it has a physical barcode. The barcode field remains optional for items that have a manufacturer UPC/EAN label.

---

## Future Considerations (not in v1)

- PWA / offline support with sync
- QR code label generation and printing
- Multi-location database sync
- Purchase order management
- Supplier tracking
- Bulk import/export (CSV)
- Image upload for items
- API key access for integrations
