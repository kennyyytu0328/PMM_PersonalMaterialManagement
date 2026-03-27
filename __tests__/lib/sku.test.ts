import { describe, it, expect } from 'vitest'
import { generateSku } from '@/lib/sku'

describe('generateSku', () => {
  it('generates SKU with PMM prefix and zero-padded number', () => {
    expect(generateSku(1)).toBe('PMM-00001')
    expect(generateSku(42)).toBe('PMM-00042')
    expect(generateSku(99999)).toBe('PMM-99999')
  })

  it('handles numbers beyond 5 digits', () => {
    expect(generateSku(100000)).toBe('PMM-100000')
  })
})
