import { describe, it, expect } from 'vitest'
import {
  createPersonSchema,
  updatePersonSchema,
  createAssetSchema,
  transferAssetSchema,
  changeAssetStatusSchema,
  createScrapRequestSchema,
  reviewScrapRequestSchema,
} from '@/lib/validations'

describe('createPersonSchema', () => {
  it('validates a person with name only', () => {
    expect(createPersonSchema.safeParse({ name: '王小明' }).success).toBe(true)
  })

  it('accepts optional department and email', () => {
    const result = createPersonSchema.safeParse({
      name: '王小明',
      department: 'IT',
      email: 'ming@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(createPersonSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(
      createPersonSchema.safeParse({ name: '王小明', email: 'not-an-email' }).success
    ).toBe(false)
  })
})

describe('updatePersonSchema', () => {
  it('accepts isActive toggle alone', () => {
    expect(updatePersonSchema.safeParse({ isActive: false }).success).toBe(true)
  })

  it('accepts clearing department and email with null (Task 12 regression)', () => {
    expect(updatePersonSchema.safeParse({ department: null }).success).toBe(true)
    expect(updatePersonSchema.safeParse({ email: null }).success).toBe(true)
  })
})

describe('createAssetSchema', () => {
  it('validates minimal asset (name only, assetNo auto-generated)', () => {
    expect(createAssetSchema.safeParse({ name: 'Dell Laptop' }).success).toBe(true)
  })

  it('accepts full asset', () => {
    const result = createAssetSchema.safeParse({
      assetNo: 'AST-2026-0001',
      name: 'Dell Laptop',
      description: 'Latitude 5440',
      categoryId: 1,
      locationId: 2,
      custodianId: 3,
      acquiredAt: '2026-07-01',
      cost: 32000,
      vendor: 'Dell Taiwan',
      barcode: '4711234567890',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(createAssetSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects negative cost', () => {
    expect(createAssetSchema.safeParse({ name: 'X', cost: -1 }).success).toBe(false)
  })
})

describe('createAssetSchema serialNo', () => {
  it('accepts a valid serial number', () => {
    const result = createAssetSchema.safeParse({ name: 'Laptop', serialNo: 'SN-2026-00042' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.serialNo).toBe('SN-2026-00042')
  })

  it('accepts payload without serialNo', () => {
    const result = createAssetSchema.safeParse({ name: 'Laptop' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.serialNo).toBeUndefined()
  })

  it('rejects serialNo longer than 120 chars', () => {
    const result = createAssetSchema.safeParse({ name: 'Laptop', serialNo: 'X'.repeat(121) })
    expect(result.success).toBe(false)
  })
})

describe('transferAssetSchema', () => {
  it('requires custodianId', () => {
    expect(transferAssetSchema.safeParse({}).success).toBe(false)
    expect(transferAssetSchema.safeParse({ custodianId: 2 }).success).toBe(true)
  })
})

describe('changeAssetStatusSchema', () => {
  it('accepts non-scrap statuses', () => {
    for (const status of ['idle', 'in_use', 'repair', 'lent_out', 'lost']) {
      expect(changeAssetStatusSchema.safeParse({ status }).success).toBe(true)
    }
  })

  it('rejects scrapped (must go through scrap request)', () => {
    expect(changeAssetStatusSchema.safeParse({ status: 'scrapped' }).success).toBe(false)
  })
})

describe('createScrapRequestSchema', () => {
  it('requires assetId and reason', () => {
    expect(createScrapRequestSchema.safeParse({ assetId: 1, reason: '老舊損壞' }).success).toBe(true)
    expect(createScrapRequestSchema.safeParse({ assetId: 1, reason: '' }).success).toBe(false)
    expect(createScrapRequestSchema.safeParse({ reason: 'x' }).success).toBe(false)
  })
})

describe('reviewScrapRequestSchema', () => {
  it('accepts approve and reject', () => {
    expect(reviewScrapRequestSchema.safeParse({ action: 'approve' }).success).toBe(true)
    expect(
      reviewScrapRequestSchema.safeParse({ action: 'reject', reviewNote: 'still usable' }).success
    ).toBe(true)
  })

  it('rejects unknown action', () => {
    expect(reviewScrapRequestSchema.safeParse({ action: 'maybe' }).success).toBe(false)
  })
})
