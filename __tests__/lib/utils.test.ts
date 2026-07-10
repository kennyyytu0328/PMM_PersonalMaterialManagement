import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency, cn } from '@/lib/utils'

describe('formatDate', () => {
  it('treats SQLite datetime strings (no timezone marker) as UTC', () => {
    // SQLite datetime('now') stores UTC without a timezone marker.
    // Both inputs below are the same instant and must render identically.
    expect(formatDate('2026-07-10 08:42:00')).toBe(
      formatDate('2026-07-10T08:42:00Z')
    )
  })

  it('renders ISO strings with explicit UTC marker unchanged', () => {
    const iso = '2026-07-10T08:45:06.861Z'
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)))
  })

  it('accepts Date objects', () => {
    const d = new Date('2026-01-15T00:00:00Z')
    expect(formatDate(d)).toMatch(/Jan/)
  })
})

describe('formatCurrency', () => {
  it('formats USD amounts', () => {
    expect(formatCurrency(3290)).toBe('$3,290.00')
  })
})

describe('cn', () => {
  it('merges tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
