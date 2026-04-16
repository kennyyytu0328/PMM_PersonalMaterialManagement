# PMM - Personal Material Management

A mobile-first web application for tracking personal inventory, materials, and equipment. Manage stock levels, scan barcodes, track checkouts, and generate reports — all from your phone or desktop.

## Features

- **Inventory Management** — Full CRUD for items with SKU generation, barcode support, and stock tracking
- **Barcode Scanner** — Scan Code 39 barcodes using your device camera to quickly look up or add items
- **Stock Transactions** — Record stock in, stock out, and adjustments with full audit trail
- **Checkout System** — Check out items to users with due dates and return tracking
- **Reports & Analytics** — Summary stats, stock movement charts, low-stock alerts, category/location breakdowns
- **Admin Panel** — Manage users, categories, and locations with role-based access control
- **Self-Service Profile** — Users can change their own password; admins can reset any user's password
- **Internationalization** — Full UI support for English and 繁體中文 (Traditional Chinese) via cookie-based locale
- **Mobile-First UI** — Bottom navigation, responsive design, works great on phones and tablets
- **Docker Ready** — One-command deployment with auto-migration and seeding

## Screenshots

<!-- Add screenshots here after deployment -->

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 (strict mode) |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [NextAuth v5](https://authjs.dev/) (credentials, JWT, role-based) |
| Validation | [Zod](https://zod.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Charts | [Recharts](https://recharts.org/) |
| Scanner | [html5-qrcode](https://github.com/niceDev0908/html5-qrcode) |
| i18n | [next-intl](https://next-intl.dev/) (cookie-based, en + zh-TW) |
| Testing | [Vitest](https://vitest.dev/) + Testing Library |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/kennyyytu0328/PMM_PersonalMaterialManagement.git
cd PMM_PersonalMaterialManagement

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env and set a random NEXTAUTH_SECRET

# Generate and run database migrations
pnpm db:generate
pnpm db:migrate

# Seed the database with sample data
pnpm seed

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:

- **Email:** `admin@pmm.local`
- **Password:** `admin123`

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:studio` | Open Drizzle Studio (DB browser) |
| `pnpm seed` | Seed database with sample data |

## Docker Deployment

```bash
# Build and start with Docker Compose
docker compose up -d
```

The container automatically handles migrations and seeding on first startup. The database is persisted in a Docker volume.

- **Port:** 3000
- **Default login:** `admin@pmm.local` / `admin123`

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (main)/                # Protected pages
│   │   ├── dashboard/         # Home dashboard
│   │   ├── items/             # Item management
│   │   ├── scan/              # Barcode scanner
│   │   ├── activity/          # Transaction log
│   │   ├── reports/           # Analytics
│   │   ├── admin/             # User, category & location management
│   │   └── profile/           # Self-service profile & password change
│   └── api/                   # REST API routes
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── layout/                # Header, BottomNav, LanguageSwitcher
│   └── ...                    # Feature-specific components
├── db/
│   ├── schema.ts              # Database schema (Drizzle)
│   └── migrations/            # Generated SQL migrations
├── i18n/                      # next-intl config + request handler
├── lib/                       # Auth, validation, utilities, server actions
└── types/                     # TypeScript type augmentations

messages/
├── en.json                    # English translations
└── zh-TW.json                 # Traditional Chinese translations
```

## Database Schema

```
users          1──N  transactions
users          1──N  checkouts
categories     1──N  items
locations      1──N  items
items          1──N  transactions
items          1──N  checkouts
```

**Tables:** `users`, `items`, `categories`, `locations`, `transactions`, `checkouts`

## User Roles

| Role | Permissions |
|------|------------|
| `admin` | Full access — manage users, categories, locations, all items |
| `staff` | Create/edit items, record transactions, manage checkouts |
| `viewer` | Read-only access to inventory and reports |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./data/pmm.db` |
| `NEXTAUTH_SECRET` | JWT signing secret (required) | — |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |

## Documentation

- [Manual Testing Guide](docs/manual-testing.md) — Step-by-step verification for every feature
- [Tech Stack & Testing](docs/tech-stack-and-testing.md) — Stack details and Docker testing checklist

## License

This project is for personal use. See [LICENSE](LICENSE) for details.
