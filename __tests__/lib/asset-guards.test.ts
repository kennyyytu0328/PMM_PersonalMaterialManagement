import { describe, it, expect } from 'vitest'
import { ASSET_STATUSES, assetActionBlockReason } from '@/lib/asset-guards'

describe('ASSET_STATUSES', () => {
  it('contains the six lifecycle statuses in order', () => {
    expect(ASSET_STATUSES).toEqual(['idle', 'in_use', 'repair', 'lent_out', 'lost', 'scrapped'])
  })
})

describe('assetActionBlockReason', () => {
  it('blocks scrapped assets', () => {
    expect(assetActionBlockReason('scrapped', false)).toBe('scrapped')
  })

  it('scrapped wins over pending scrap', () => {
    expect(assetActionBlockReason('scrapped', true)).toBe('scrapped')
  })

  it('blocks assets with a pending scrap request', () => {
    expect(assetActionBlockReason('in_use', true)).toBe('pendingScrap')
  })

  it('allows normal statuses without pending request', () => {
    for (const status of ['idle', 'in_use', 'repair', 'lent_out', 'lost']) {
      expect(assetActionBlockReason(status, false)).toBeNull()
    }
  })
})
