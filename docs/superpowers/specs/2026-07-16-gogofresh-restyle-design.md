# Go Go Fresh Restyle — Design Spec

**Date:** 2026-07-16
**Status:** Approved by user (sections 1–5)
**Inputs:** `public/gogo_fresh.jpg` (company logo), `DESIGN.md` (Arva editorial style reference)

## Goal

Restyle the PMM web app to the Go Go Fresh brand: adopt the Arva editorial *structure* from
DESIGN.md (dark structural bands, cream canvas, pill shapes, pastel quilt cards, no shadows)
with the palette re-derived from the Go Go Fresh logo (teal structural, lime scarce accent,
navy emphasis). Full app in one pass (approved Approach B). Class-level changes only — no API,
logic, routing, or i18n changes. Light theme only.

## 1. Design Tokens

Declared in `src/app/globals.css` via Tailwind v4 `@theme`. All feature code uses these
tokens instead of raw `blue-*`/`gray-*` chrome utilities.

| Token | Value | Role (Arva equivalent) |
|---|---|---|
| `--color-teal-ink` | `#0a5c58` | Structural: header, bottom nav, primary buttons, toast (= Forest Ink) |
| `--color-teal` | `#14867f` | Interactive: links, hover, focus rings, active tab fill |
| `--color-teal-soft` | `#2ab5ae` | Decorative strokes, chart series |
| `--color-lime` | `#a5cd39` | Scarce accent: scan FAB, active nav item, highlights (= Vivid Lime) |
| `--color-navy` | `#1b3f74` | Emphasis: stat numbers, key figures (from "Fresh!" script) |
| `--color-canvas` | `#f1f4ec` | Page background — fresh celadon-cream (brand-adapted Bone) |
| `--color-sky-card` | `#bfdeea` | Pastel quilt tile |
| `--color-sage-card` | `#dfecc8` | Pastel quilt tile |
| `--color-aqua-card` | `#cdeae6` | Pastel quilt tile |
| `--color-ash-card` | `#efefef` | Pastel quilt tile / secondary surface |
| `--color-charcoal` | `#212529` | Primary text |
| `--color-pewter` | `#6d6d6d` | Muted text |
| `--color-mist-border` | `#c8d6cf` | Input/card borders (= Moss) |

**Semantic colors:** danger stays red (`red-600` family) for destructive actions; success maps
to teal; warning stays amber. Status badge fills move to the pastel family (see §3 Badge).

**Hard rules (from DESIGN.md Do/Don't, adapted):**
- Lime is NEVER text on light backgrounds (contrast failure). It appears only as a fill with
  teal-ink content on it, or as icon/label color on teal-ink bands.
- No `box-shadow` anywhere. Elevation = surface color shifts (white/pastel on canvas, teal
  bands as structure). Dropdown/modal separation comes from borders and scrims.
- Page background is always `canvas`, never pure white.
- One pastel surface per card; rotate sky → sage → aqua → ash across a row/grid.

**Typography:** Inter + Noto Sans TC via `next/font/google`, replacing Geist Sans (no CJK
coverage). Geist Mono stays for SKUs/numeric. Weights 400/500/600/700. Existing heading
tracking (-0.025em) kept.

**Shape:** buttons & nav pills `rounded-full`; inputs & selects `rounded-full` (Arva 33px
feel); cards `rounded-[20px]`; modals `rounded-[24px]`; dropdown menus `rounded-[20px]`.

## 2. Layout Chrome & Login

- **Header** (`src/components/layout/header.tsx`): solid `teal-ink` band, no bottom border.
  Brand mark: `public/gogo_fresh_transparent.png` (provided) at ~32px height via
  `next/image`. Search + user
  icons white/70, white on hover. User dropdown: white card, 20px radius, border, no shadow;
  sign-out row stays red.
- **Bottom nav** (`src/components/layout/bottom-nav.tsx`): `teal-ink` band. Inactive items
  `white/65`; active item lime icon + lime label. Scan FAB: lime circle, `teal-ink` camera
  icon, raised as today, no shadow. This FAB is the single loudest element in the app.
- **Login** (`src/app/(auth)/login/`): celadon canvas; centered white 20px-radius card
  containing the existing `gogo_fresh.jpg` as hero (white JPG background blends into the white
  card), app title, pill inputs, full-width teal-ink pill sign-in button.

## 3. Shared UI Components (`src/components/ui/`)

- **Button** (`button.tsx`): all variants `rounded-full`, focus ring `teal`.
  - `primary`: teal-ink fill, white text, darker teal hover/active.
  - `secondary`: white fill, 1px `mist-border`, charcoal text (Arva ghost pill).
  - `danger`: red kept as today.
  - `ghost`: charcoal text, ash hover.
- **Input / Select** (`input.tsx`, `select.tsx`): white fill, 1px `mist-border`,
  `rounded-full`, focus ring teal. Select keeps right padding for chevron inside the pill.
- **Card** (`card.tsx`): `rounded-[20px]`, border `mist-border`, no shadow. New optional
  `surface` prop: `'white' | 'sky' | 'sage' | 'aqua' | 'ash'` (default white) enabling the
  pastel quilt without one-off classes. Pastel surfaces drop the border.
- **Badge** (`badge.tsx`): pill. Fills: in-stock = sage + teal-ink text; low-stock = peach
  `#fceace` + amber-800 `#92400e` text; out-of-stock = red-100 fill + red-700 text;
  checked-out = sky + navy. Asset status colors follow the same pastel system.
- **Modal** (`modal.tsx`): `rounded-[24px]`, white, no shadow (scrim separates).
- **Toast** (`toast.tsx`): teal-ink surface, white text, pill shape. Error toast keeps red.
- **ContentTabs** (`content-tabs.tsx`) + AdminTabs + ItemFilters chips: pill segmented
  controls — active segment teal fill + white text; inactive white fill + mist border +
  charcoal text.
- **Loading / EmptyState**: teal spinner; teal icon + pewter text.

## 4. Feature-Page Sweep

- **Dashboard**: stat cards use the pastel quilt rotation (sky/sage/aqua/ash) with `navy`
  stat numbers, charcoal labels; quick actions become teal/white pills.
- **Items & Assets** (lists, detail, forms): white 20px cards on canvas; blue accents → teal;
  forms inherit pill inputs from the UI kit.
- **Scan**: viewfinder chrome teal; hint text on teal-ink scrim.
- **Activity**: type icons — in = teal, out = amber-600 `#d97706`, adjust = sky-derived
  `#4a91b3`, asset events = navy; tab strip inherits pill tabs.
- **Reports**: Recharts palette = teal `#14867f`, lime `#a5cd39`, sky `#bfdeea`, navy
  `#1b3f74`; grid/axis stroke = `mist-border` `#c8d6cf`; stat cards join the quilt.
- **Admin & Profile**: tables/rows on white cards; admin tabs inherit pills; role badges
  use pastels.
- Sweep every remaining `blue-*` / chrome `gray-*` class in feature files (~20 files) to
  token equivalents. Mechanical; no logic changes.

## 5. Error Handling, Testing, Verification

- Only new logic: Card `surface` prop.
- `pnpm test` stays green; if a test asserts a changed class, check the test's intent before
  updating it.
- `pnpm lint` and `pnpm build` must pass.
- Visual verification on mobile viewport via dev server (project `verify` skill): login,
  dashboard, items, scan, activity, reports, admin.
- Contrast spot-checks: white on teal-ink ≈7.4:1 ✓; charcoal on canvas ✓; charcoal on all
  pastels ✓; lime never as text on light.

## Out of Scope

- Dark mode; new features; i18n message changes; server/API changes; DESIGN.md's serif
  typography (user chose sans-only); marquee strip (no promotional content in this app).

## Decisions Log

- Teal structural + lime accent mapping — user approved (recommended option).
- Sans-only typography (Inter + Noto Sans TC) — user chose over serif pairing.
- Transparent logo provided at `public/gogo_fresh_transparent.png` (2026-07-16).
- Approach B: full Arva restructure in one pass — user approved.
- Celadon-cream canvas `#f1f4ec` (vs Arva warm bone) and strict no-shadow rule — user approved.
