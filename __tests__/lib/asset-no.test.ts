import { describe, it, expect } from 'vitest'
import { generateAssetNo, nextAssetSeq } from '@/lib/asset-no'

describe('generateAssetNo', () => {
  it('formats with 4-digit zero padding', () => {
    expect(generateAssetNo(2026, 1)).toBe('AST-2026-0001')
    expect(generateAssetNo(2026, 42)).toBe('AST-2026-0042')
  })

  it('does not truncate sequences beyond 9999', () => {
    expect(generateAssetNo(2026, 12345)).toBe('AST-2026-12345')
  })
})

describe('nextAssetSeq', () => {
  it('returns 1 for empty list', () => {
    expect(nextAssetSeq([], 2026)).toBe(1)
  })

  it('increments the max sequence of the given year', () => {
    expect(nextAssetSeq(['AST-2026-0001', 'AST-2026-0007'], 2026)).toBe(8)
  })

  it('ignores other years (year rollover restarts at 1)', () => {
    expect(nextAssetSeq(['AST-2025-0009'], 2026)).toBe(1)
  })

  it('ignores manual asset numbers that do not match the pattern', () => {
    expect(nextAssetSeq(['CUSTOM-001', 'AST-2026-0003', 'AST-2026-XXXX'], 2026)).toBe(4)
  })
})
