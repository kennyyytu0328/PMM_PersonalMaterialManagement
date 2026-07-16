# Go Go Fresh Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the PMM app to the Go Go Fresh brand — teal structural bands, lime scarce accent, celadon canvas, pill shapes, pastel quilt cards, no shadows — per the approved spec at `docs/superpowers/specs/2026-07-16-gogofresh-restyle-design.md`.

**Architecture:** All colors become Tailwind v4 `@theme` tokens in `globals.css`; shared UI components (`src/components/ui/`) carry the shape/color system so feature pages inherit most changes; a final mechanical sweep replaces remaining hardcoded `blue-*`/chrome `gray-*` classes. No logic, API, routing, or i18n-message changes (the only new logic: Card `surface` prop).

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4 (`@theme` tokens), `next/font/google` (Inter + Noto Sans TC), Vitest + Testing Library, Recharts.

## Global Constraints

- Page canvas is `#f1f4ec` (`bg-canvas` via body); NEVER pure white as page background.
- NO `box-shadow` anywhere (`shadow-*` classes are removed, not replaced). Elevation = surface color shifts.
- Lime `#a5cd39` is NEVER text on light backgrounds; it appears only as a fill with `teal-ink` content on it, or as icon/label color on `teal-ink` bands.
- Buttons/nav pills/inputs: `rounded-full`. Cards: `rounded-[20px]`. Modals: `rounded-[24px]` (top corners only on mobile sheet).
- One pastel surface per card; rotate sky → sage → aqua → ash across a row.
- Class-level changes only. Do not change component logic, props (except Card `surface` and DashboardStatCard color values), API calls, or i18n message files.
- After every task: `pnpm test` green, `pnpm lint` clean.
- All commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Token names used throughout (defined in Task 1): `teal-ink #0a5c58`, `teal-deep #084a47`, `teal #14867f`, `teal-soft #2ab5ae`, `lime #a5cd39`, `navy #1b3f74`, `canvas #f1f4ec`, `sky-card #bfdeea`, `sage-card #dfecc8`, `aqua-card #cdeae6`, `ash-card #efefef`, `peach-card #fceace`, `charcoal #212529`, `pewter #6d6d6d`, `mist #c8d6cf`.

---

### Task 1: Brand tokens & fonts

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind utilities `bg-teal-ink`, `bg-teal-deep`, `text-teal`, `text-teal-soft`, `bg-lime`, `text-navy`, `bg-canvas`, `bg-sky-card`, `bg-sage-card`, `bg-aqua-card`, `bg-ash-card`, `bg-peach-card`, `text-charcoal`, `text-pewter`, `border-mist` (and all bg/text/border/ring/divide permutations of each token). CSS vars `--font-inter`, `--font-noto-sans-tc`, `--font-geist-mono` on `<html>`. Every later task depends on these existing.

- [ ] **Step 1: Replace `src/app/globals.css` with the token system**

```css
@import "tailwindcss";

:root {
  --background: #f1f4ec;
  --foreground: #212529;
}

@theme {
  --ease-swift: cubic-bezier(0.05, 0.7, 0.1, 1);

  /* Go Go Fresh brand tokens */
  --color-teal-ink: #0a5c58;
  --color-teal-deep: #084a47;
  --color-teal: #14867f;
  --color-teal-soft: #2ab5ae;
  --color-lime: #a5cd39;
  --color-navy: #1b3f74;
  --color-canvas: #f1f4ec;
  --color-sky-card: #bfdeea;
  --color-sage-card: #dfecc8;
  --color-aqua-card: #cdeae6;
  --color-ash-card: #efefef;
  --color-peach-card: #fceace;
  --color-charcoal: #212529;
  --color-pewter: #6d6d6d;
  --color-mist: #c8d6cf;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family:
    var(--font-inter),
    var(--font-noto-sans-tc),
    ui-sans-serif,
    system-ui,
    sans-serif;
}

h1,
h2,
h3 {
  letter-spacing: -0.025em;
}

::selection {
  background: #cdeae6;
}

@keyframes surface-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .animate-surface-in {
    animation: surface-in 200ms var(--ease-swift);
  }
  .animate-fade-in {
    animation: fade-in 200ms var(--ease-swift);
  }
}
```

- [ ] **Step 2: Replace fonts in `src/app/layout.tsx`**

Replace the imports and font constants (lines 1–16) and the `<html>` className (line 38). Full new file:

```tsx
import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Inter, Noto_Sans_TC } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const notoSansTC = Noto_Sans_TC({
  variable: '--font-noto-sans-tc',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoSansTC.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

Note: `--font-geist-sans` no longer exists after this. Step 4's grep confirms nothing else references it.

- [ ] **Step 3: Verify no stale font references**

Run: `grep -rn "geist-sans\|geistSans" src/`
Expected: 0 matches.

- [ ] **Step 4: Run lint, tests, build**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: all pass (colors are additive; nothing consumes them yet).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: Go Go Fresh brand tokens and Inter + Noto Sans TC fonts"
```

---

### Task 2: Card `surface` prop (TDD)

**Files:**
- Create: `__tests__/components/card.test.tsx`
- Modify: `src/components/ui/card.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: `Card` accepts optional `surface?: 'white' | 'sky' | 'sage' | 'aqua' | 'ash'` (default `'white'`). White surface has `border border-mist`; pastel surfaces have no border. All surfaces `rounded-[20px] p-4`. `CardHeader`/`CardTitle`/`CardContent` unchanged signatures. Tasks 7–8 rely on `surface` existing.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/card.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card } from '@/components/ui/card'

describe('Card surface prop', () => {
  it('defaults to white surface with mist border and 20px radius', () => {
    const { container } = render(<Card>content</Card>)
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-white')
    expect(card.className).toContain('border-mist')
    expect(card.className).toContain('rounded-[20px]')
  })

  it('renders pastel surfaces without a border', () => {
    const { container } = render(<Card surface="sage">content</Card>)
    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('bg-sage-card')
    expect(card.className).not.toContain('border-mist')
  })

  it('still merges custom className', () => {
    const { container } = render(<Card className="mt-2">content</Card>)
    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test __tests__/components/card.test.tsx`
Expected: FAIL — `surface` prop not accepted / `bg-sage-card` missing.

- [ ] **Step 3: Implement Card**

Replace `src/components/ui/card.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

type CardSurface = 'white' | 'sky' | 'sage' | 'aqua' | 'ash'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: CardSurface
}

const surfaceClasses: Record<CardSurface, string> = {
  white: 'border border-mist bg-white',
  sky: 'bg-sky-card',
  sage: 'bg-sage-card',
  aqua: 'bg-aqua-card',
  ash: 'bg-ash-card',
}

export function Card({ className, surface = 'white', ...props }: CardProps) {
  return (
    <div className={cn('rounded-[20px] p-4', surfaceClasses[surface], className)} {...props} />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold tracking-tight text-charcoal', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-pewter', className)} {...props} />
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test`
Expected: card tests PASS, all other suites still green.

- [ ] **Step 5: Commit**

```bash
git add __tests__/components/card.test.tsx src/components/ui/card.tsx
git commit -m "feat: Card surface prop with pastel quilt variants"
```

---

### Task 3: Pill buttons & form controls

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/select.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: unchanged component APIs (`Button` variants `primary|secondary|danger|ghost`, sizes `sm|md|lg`; `Input`/`Select` props unchanged). Only class strings change.

- [ ] **Step 1: Update Button**

Replace the `className` construction in `src/components/ui/button.tsx` (keep the rest of the file identical):

```tsx
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium transition duration-150 ease-swift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-teal-ink text-white hover:bg-teal-deep active:bg-teal-deep': variant === 'primary',
            'border border-mist bg-white text-charcoal hover:bg-ash-card active:bg-ash-card': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800': variant === 'danger',
            'text-pewter hover:bg-ash-card hover:text-charcoal active:bg-ash-card': variant === 'ghost',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
```

- [ ] **Step 2: Update Input**

In `src/components/ui/input.tsx`, replace the label className with `'block text-sm font-medium text-charcoal'` and the input className base string with:

```tsx
            'block w-full rounded-full border border-mist bg-white px-4 py-2 text-sm transition-colors duration-150 ease-swift placeholder:text-pewter/70 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20',
```

(The `error && ...` red override line stays exactly as-is.)

- [ ] **Step 3: Update Select**

In `src/components/ui/select.tsx`, same label change (`text-charcoal`), and select className base string:

```tsx
            'block w-full rounded-full border border-mist bg-white py-2 pl-4 pr-9 text-sm transition-colors duration-150 ease-swift focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20',
```

- [ ] **Step 4: Run lint + tests**

Run: `pnpm lint && pnpm test`
Expected: green — `asset-form-serial.test.tsx` exercises Input/Select and asserts behavior, not classes.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/select.tsx
git commit -m "feat: pill-shaped teal buttons and form controls"
```

---

### Task 4: Feedback & tab components

**Files:**
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/modal.tsx`
- Modify: `src/components/ui/toast.tsx`
- Modify: `src/components/ui/content-tabs.tsx`
- Modify: `src/components/ui/loading.tsx`
- Modify: `src/components/ui/empty-state.tsx`

**Interfaces:**
- Consumes: tokens (Task 1).
- Produces: unchanged component APIs; only classes/markup styling change. ContentTabs becomes pill segmented control (consumed visually by activity/reports/admin pages with no code change there).

- [ ] **Step 1: Badge variant fills → pastel system**

In `src/components/ui/badge.tsx`, replace the variant map:

```tsx
        {
          'bg-ash-card text-charcoal': variant === 'default',
          'bg-sage-card text-teal-ink': variant === 'success',
          'bg-peach-card text-amber-800': variant === 'warning',
          'bg-red-100 text-red-700': variant === 'danger',
          'bg-sky-card text-navy': variant === 'info',
        },
```

- [ ] **Step 2: Modal → 24px radius, no shadow**

In `src/components/ui/modal.tsx`:
- Scrim div: `'animate-fade-in fixed inset-0 bg-charcoal/50'`
- Panel: replace `'animate-surface-in relative z-50 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl shadow-gray-950/10'` with `'animate-surface-in relative z-50 w-full max-w-md rounded-t-[24px] bg-white p-6 sm:rounded-[24px]'`
- Title h2: `text-charcoal` instead of `text-gray-900`
- Close button: `'rounded-full p-1 text-pewter transition-colors duration-150 ease-swift hover:bg-ash-card hover:text-charcoal'`

- [ ] **Step 3: Toast → teal-ink pill**

In `src/components/ui/toast.tsx`, replace the toast row div classes and icons:

```tsx
          <div
            key={t.id}
            className={cn(
              'animate-surface-in flex items-center gap-2.5 rounded-full px-4 py-3 text-sm font-medium text-white',
              t.type === 'success' && 'bg-teal-ink',
              t.type === 'error' && 'bg-red-600'
            )}
          >
            {t.type === 'success' ? (
              <CheckCircle size={18} className="shrink-0 text-lime" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-white" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/70 transition-colors duration-150 ease-swift hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
```

(Lime icon sits on teal-ink — allowed by the lime rule.)

- [ ] **Step 4: ContentTabs → pill segmented control**

In `src/components/ui/content-tabs.tsx`, replace the wrapper and button classes:

```tsx
    <div className="mb-4 flex gap-2">
      {tabs.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-swift',
            active === key
              ? 'border-teal-ink bg-teal-ink text-white'
              : 'border-mist bg-white text-pewter hover:text-charcoal'
          )}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
```

(Both states carry a border so pill heights match.)

- [ ] **Step 5: Loading & EmptyState**

`src/components/ui/loading.tsx`:

```tsx
export function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-mist border-t-teal" />
      <p className="mt-3 text-sm text-pewter">{text}</p>
    </div>
  )
}
```

`src/components/ui/empty-state.tsx` — icon wrapper `text-teal-soft`, title `text-charcoal`, description `text-pewter`:

```tsx
      <div className="mb-3 text-teal-soft">{icon}</div>
      <h3 className="text-lg font-medium text-charcoal">{title}</h3>
      <p className="mt-1 text-sm text-pewter">{description}</p>
```

- [ ] **Step 6: Run lint + tests, commit**

Run: `pnpm lint && pnpm test`
Expected: green.

```bash
git add src/components/ui/
git commit -m "feat: pastel badges, teal toast, pill tabs, branded feedback components"
```

---

### Task 5: App chrome — header, language switcher, bottom nav

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/language-switcher.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`
- Asset (exists): `public/gogo_fresh_transparent.png`

**Interfaces:**
- Consumes: tokens (Task 1); `public/gogo_fresh_transparent.png`.
- Produces: no API changes. Header shows logo image instead of `t('appName')` text (translation key stays for aria-label).

- [ ] **Step 1: Header → teal-ink band with logo**

Replace `src/components/layout/header.tsx`:

```tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import { Search, User, LogOut, Settings, KeyRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from './language-switcher'

export function Header() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useTranslations('header')

  return (
    <header className="sticky top-0 z-30 bg-teal-ink">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" aria-label={t('appName')} className="flex items-center">
          <Image
            src="/gogo_fresh_transparent.png"
            alt={t('appName')}
            width={120}
            height={53}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/items?search=true"
            className="text-white/70 transition-colors duration-150 ease-swift hover:text-white"
            aria-label={t('search')}
          >
            <Search size={20} />
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white/70 transition-colors duration-150 ease-swift hover:text-white"
              aria-label={t('userMenu')}
            >
              <User size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                <div className="animate-surface-in absolute right-0 top-8 w-48 rounded-[20px] border border-mist bg-white py-1">
                  <div className="border-b border-ash-card px-3 py-2">
                    <p className="text-sm font-medium text-charcoal">{session?.user?.name}</p>
                    <p className="text-xs text-pewter">{(session?.user as any)?.role}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-charcoal hover:bg-ash-card"
                    onClick={() => setMenuOpen(false)}
                  >
                    <KeyRound size={16} />
                    {t('changePassword')}
                  </Link>
                  {(session?.user as any)?.role === 'admin' && (
                    <Link
                      href="/admin/users"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-charcoal hover:bg-ash-card"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings size={16} />
                      {t('adminSettings')}
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-ash-card"
                  >
                    <LogOut size={16} />
                    {t('signOut')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: LanguageSwitcher → white-on-teal**

In `src/components/layout/language-switcher.tsx`, the label sits on the teal header now:

```tsx
    <label className="flex items-center gap-1 text-white/70" aria-label={t('language')}>
      <Languages size={18} />
      <select
        value={currentLocale}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-sm text-white outline-none disabled:opacity-50 [&>option]:text-charcoal"
      >
```

(`[&>option]:text-charcoal` keeps the native dropdown list readable on its white popup.)

- [ ] **Step 3: BottomNav → teal-ink band, lime active, lime FAB**

Replace `src/components/layout/bottom-nav.tsx` nav/link classes (structure and navItems stay identical):

```tsx
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-teal-ink pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isScan = item.href === '/scan'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex flex-col items-center py-2 px-2 transition-colors duration-150 ease-swift',
                isScan ? 'relative -top-3' : '',
                isActive ? 'text-lime' : 'text-white/65 hover:text-white'
              )}
            >
              {isScan ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-teal-ink transition-transform duration-150 ease-swift group-active:scale-95">
                  <item.icon size={24} />
                </div>
              ) : (
                <item.icon size={22} />
              )}
              <span
                className={cn('text-[10px] mt-1', isActive && 'font-medium', isScan && 'text-lime')}
              >
                {t(item.key)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
```

(Lime label/icon on teal-ink band — allowed. FAB shadow removed per no-shadow rule.)

- [ ] **Step 4: Run lint + tests, commit**

Run: `pnpm lint && pnpm test`
Expected: green.

```bash
git add src/components/layout/
git commit -m "feat: teal chrome with Go Go Fresh logo and lime scan FAB"
```

---

### Task 6: Login page

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: tokens, `Input`/`Button` (already pill from Task 3), logo asset.
- Produces: no API changes; hardcoded "Stockpile" h1 replaced by logo image + sr-only heading.

- [ ] **Step 1: Auth layout → canvas background**

`src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Login page → white hero card with logo**

In `src/app/(auth)/login/page.tsx`, replace the returned JSX (imports gain `Image from 'next/image'`; handlers unchanged):

```tsx
  return (
    <div className="w-full max-w-sm rounded-[20px] border border-mist bg-white p-6">
      <div className="mb-8 text-center">
        <Image
          src="/gogo_fresh_transparent.png"
          alt="Go Go Fresh"
          width={200}
          height={88}
          priority
          className="mx-auto h-20 w-auto"
        />
        <h1 className="sr-only">Go Go Fresh</h1>
        <p className="mt-3 text-sm text-pewter">{t('subtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-[20px] bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        <Input
          id="email"
          label={t('emailLabel')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          required
        />
        <Input
          id="password"
          label={t('passwordLabel')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('passwordPlaceholder')}
          required
        />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t('signingIn') : t('signIn')}
        </Button>
      </form>
    </div>
  )
```

- [ ] **Step 3: Run lint + tests, commit**

Run: `pnpm lint && pnpm test`
Expected: green.

```bash
git add "src/app/(auth)/"
git commit -m "feat: Go Go Fresh login hero card"
```

---

### Task 7: Dashboard & reports recolor

**Files:**
- Modify: `src/components/reports/dashboard-stat-card.tsx`
- Modify: `src/app/(main)/dashboard/page.tsx`
- Modify: `src/components/reports/stat-card.tsx`
- Modify: `src/components/reports/asset-stats.tsx`
- Modify: `src/components/reports/stock-chart.tsx`
- Modify: `src/components/activity/activity-item.tsx`

**Interfaces:**
- Consumes: tokens; Card surface prop (Task 2).
- Produces: `DashboardStatCard` `color` prop values change from `'blue' | 'yellow' | 'green' | 'purple'` to `'sky' | 'sage' | 'aqua' | 'ash'` — TypeScript forces every caller to update in this task. Run `grep -rn "DashboardStatCard" src/` and update ALL callers found.

- [ ] **Step 1: DashboardStatCard → pastel quilt tile**

Replace `src/components/reports/dashboard-stat-card.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type StatSurface = 'sky' | 'sage' | 'aqua' | 'ash'

interface DashboardStatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color: StatSurface
}

const surfaceMap: Record<StatSurface, string> = {
  sky: 'bg-sky-card',
  sage: 'bg-sage-card',
  aqua: 'bg-aqua-card',
  ash: 'bg-ash-card',
}

export function DashboardStatCard({ label, value, icon, color }: DashboardStatCardProps) {
  return (
    <div className={cn('h-full rounded-[20px] p-4', surfaceMap[color])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal/70">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-navy tabular-nums">
            {value}
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-white/60 p-2 text-teal-ink">{icon}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update dashboard callers to the quilt rotation**

In `src/app/(main)/dashboard/page.tsx`, update the seven `color=` props:
- Items row (4 cards): `totalItems` → `color="sky"`, `lowStock` → `color="sage"`, `checkedOut` → `color="aqua"`, `inventoryValue` → `color="ash"`
- Assets row (3 cards): `totalAssets` → `color="sky"`, `assetsInUse` → `color="sage"`, `pendingScrap` → `color="aqua"`

Then: `grep -rn "DashboardStatCard" src/` — if any file outside dashboard/page.tsx uses it (e.g. reports page), apply the same rotation order there (sky → sage → aqua → ash by position).

- [ ] **Step 3: StatCard (reports) → navy values**

Replace `src/components/reports/stat-card.tsx`:

```tsx
interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  warning?: string
  highlight?: boolean
}

export function StatCard({ label, value, sub, warning, highlight }: StatCardProps) {
  return (
    <div
      className={`rounded-[20px] border p-4 ${highlight ? 'border-red-200 bg-red-50' : 'border-mist bg-white'}`}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-red-600' : 'text-pewter'}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${highlight ? 'text-red-700' : 'text-navy'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-pewter/80">{sub}</p>}
      {warning && <p className="mt-0.5 text-xs font-medium text-amber-600">{warning}</p>}
    </div>
  )
}
```

- [ ] **Step 4: AssetStats progress bars → teal**

In `src/components/reports/asset-stats.tsx` line 62–64: track `bg-gray-100` → `bg-ash-card`; fill `bg-blue-500` → `bg-teal`; count text `text-gray-700` → `text-charcoal`.

- [ ] **Step 5: StockChart → brand palette**

In `src/components/reports/stock-chart.tsx`:
- `<CartesianGrid strokeDasharray="3 3" stroke="#c8d6cf" />`
- Tooltip `contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #c8d6cf' }}`
- `<Bar dataKey="IN" ... fill="#14867f" radius={[4, 4, 0, 0]} />`
- `<Bar dataKey="OUT" ... fill="#1b3f74" radius={[4, 4, 0, 0]} />`
- `<Bar dataKey="ADJUST" ... fill="#bfdeea" radius={[4, 4, 0, 0]} />`

- [ ] **Step 6: ActivityItem → brand type colors**

In `src/components/activity/activity-item.tsx`, replace `typeConfig` colors and the amount span:

```tsx
  IN: { icon: <ArrowDown size={16} />, color: 'text-teal bg-aqua-card', prefix: '+' },
  OUT: { icon: <ArrowUp size={16} />, color: 'text-amber-700 bg-peach-card', prefix: '-' },
  ADJUST: { icon: <Settings size={16} />, color: 'text-[#4a91b3] bg-sky-card', prefix: '' },
  CHECKOUT: { icon: <ArrowUpRight size={16} />, color: 'text-navy bg-sky-card', prefix: '-' },
  RETURN: { icon: <RotateCcw size={16} />, color: 'text-teal-ink bg-sage-card', prefix: '+' },
```

Amount span classes:

```tsx
        className={cn(
          'text-sm font-semibold',
          type === 'IN' || type === 'RETURN' ? 'text-teal' : 'text-amber-700',
          type === 'ADJUST' && 'text-pewter'
        )}
```

Item name `text-gray-900` → `text-charcoal`; meta line `text-gray-500` → `text-pewter`.

- [ ] **Step 7: Run lint + tests + build, commit**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: green (build catches any missed DashboardStatCard caller).

```bash
git add src/components/reports/ src/components/activity/activity-item.tsx "src/app/(main)/dashboard/page.tsx"
git commit -m "feat: pastel quilt stats, brand chart palette, activity type colors"
```

---

### Task 8: Feature-file sweep (mechanical class mapping)

**Files:**
- Modify: every remaining `.tsx` under `src/` matching the greps below. Known list: `src/components/items/*` (item-card, item-form, item-filters, checkout-modal, stock-modal), `src/components/assets/*` (asset-form, asset-status-badge), `src/components/admin/admin-tabs.tsx`, `src/components/activity/asset-event-row.tsx`, `src/components/scanner/*`, and pages under `src/app/(main)/` (items, assets, scan, activity, reports, admin/*, profile).

**Interfaces:**
- Consumes: tokens (Task 1). No component APIs change.
- Produces: zero `blue-*`, zero `shadow-*`, zero chrome `gray-*` classes in `src/`.

Apply this exact mapping in every matched file (old → new):

| Old class | New class |
|---|---|
| `bg-blue-600` | `bg-teal-ink` |
| `hover:bg-blue-700` | `hover:bg-teal-deep` |
| `active:bg-blue-800` | `active:bg-teal-deep` |
| `text-blue-600` / `text-blue-700` | `text-teal` |
| `text-blue-800` | `text-navy` |
| `bg-blue-50` | `bg-aqua-card` |
| `bg-blue-100` | `bg-sky-card` |
| `border-blue-500` / `border-blue-600` | `border-teal` |
| `focus:border-blue-500` | `focus:border-teal` |
| `ring-blue-500` (any opacity suffix) | `ring-teal` (same suffix) |
| `bg-emerald-50 text-emerald-700` (status chips) | `bg-sage-card text-teal-ink` |
| `text-emerald-600` / `text-green-600` (icons/values) | `text-teal` |
| `bg-purple-50 text-purple-600` etc. | `bg-sky-card text-navy` |
| `bg-amber-50` / `bg-yellow-100` (status fills) | `bg-peach-card` |
| `bg-gray-50` (page/section bg) | `bg-canvas` |
| `bg-gray-50` (hover/row bg) / `bg-gray-100` | `bg-ash-card` |
| `border-gray-100` / `border-gray-200` / `border-gray-300` | `border-mist` |
| `divide-gray-100` / `divide-gray-200` | `divide-mist` |
| `text-gray-900` / `text-gray-800` / `text-gray-700` | `text-charcoal` |
| `text-gray-500` / `text-gray-600` | `text-pewter` |
| `text-gray-400` | `text-pewter/70` |
| `rounded-xl` on card-like containers | `rounded-[20px]` |
| `rounded-lg` on buttons/chips/inputs | `rounded-full` |
| any `shadow-*` class | delete (no replacement) |

**Judgment notes:** scanner viewfinder scrims (`bg-black`, `bg-gray-900/x`) stay — they're functional camera overlay, not chrome. `rounded-lg`/`rounded-xl` on non-interactive info boxes (e.g. error banners) may become `rounded-[20px]` instead of full. Semantic red for errors/danger stays red.

**Two files get more than the mapping:**
- `src/components/admin/admin-tabs.tsx` and `src/components/items/item-filters.tsx` (filter chips): restyle tab/chip buttons to the exact ContentTabs pill pattern from Task 4 — active: `rounded-full border border-teal-ink bg-teal-ink px-4 py-2 text-sm font-medium text-white`; inactive: `rounded-full border border-mist bg-white px-4 py-2 text-sm font-medium text-pewter hover:text-charcoal`. Keep each component's own layout wrapper and logic.
- `src/components/activity/asset-event-row.tsx`: the event-type icon chip becomes `text-navy bg-sky-card` (spec: asset events = navy), regardless of what the mapping table would produce.

- [ ] **Step 1: Inventory the targets**

Run: `grep -rln "blue-\|shadow-\|gray-" src/ --include="*.tsx" | grep -v node_modules`
Expected: a list of the remaining feature files (UI kit + chrome + reports files were finished in Tasks 2–7; only re-touch them if grep still matches).

- [ ] **Step 2: Apply the mapping file-by-file**

Work through the list applying the table above with Edit `replace_all` per class per file. No logic edits.

- [ ] **Step 3: Verify zero leftovers**

Run each; expected 0 matches:
```bash
grep -rn "blue-" src/ --include="*.tsx"
grep -rn "shadow-" src/ --include="*.tsx"
grep -rn "text-gray-\|bg-gray-\|border-gray-\|divide-gray-" src/ --include="*.tsx" | grep -v "bg-gray-900\|bg-black"
```

- [ ] **Step 4: Run lint + tests + build, commit**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: green.

```bash
git add src/
git commit -m "feat: sweep feature pages to Go Go Fresh tokens"
```

---

### Task 9: Full verification

**Files:** none created; fixes only if issues found.

- [ ] **Step 1: Static gates**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: all green.

- [ ] **Step 2: Visual verification (project `verify` skill)**

Invoke the project's `verify` skill to launch the app, then check on a mobile viewport (390×844), logging in with `admin@pmm.local` / `admin123`:
- `/login` — logo hero on white card over celadon canvas; pill inputs; teal pill button
- `/dashboard` — teal header with logo; pastel quilt stat cards with navy numbers; teal bottom nav with lime active item and lime scan FAB
- `/items` — white 20px cards, pill filters, pastel badges
- `/scan` — teal chrome, functional viewfinder
- `/activity` — pill tabs, brand type icon colors
- `/reports` — quilt stats, teal/navy/sky chart bars
- `/admin/users` (as admin) — pill admin tabs, pastel role badges
- Language switcher works and is legible on teal; zh-TW renders in Noto Sans TC

- [ ] **Step 3: Contrast spot-checks**

Confirm in the running app (DevTools or screenshot): white on `#0a5c58` (≈7.4:1), `#212529` on `#f1f4ec`, `#212529` on each pastel, `#1b3f74` on pastels — all ≥ 4.5:1. Confirm lime appears only on teal bands or as fill under teal-ink content.

- [ ] **Step 4: Fix-and-commit anything found**

Any deviation: fix, re-run the relevant gate, commit as `fix: <what>`.
