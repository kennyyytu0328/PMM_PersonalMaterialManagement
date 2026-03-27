import { describe, it, expect } from 'vitest'
import {
  createItemSchema,
  updateItemSchema,
  createTransactionSchema,
  createCheckoutSchema,
  loginSchema,
  createUserSchema,
  createCategorySchema,
  createLocationSchema,
} from '@/lib/validations'

describe('createItemSchema', () => {
  it('validates a valid item', () => {
    const result = createItemSchema.safeParse({
      name: 'USB-C Cable',
      unit: 'pcs',
      quantity: 10,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createItemSchema.safeParse({
      name: '',
      unit: 'pcs',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = createItemSchema.safeParse({
      name: 'Drill',
      unit: 'pcs',
      description: 'Power drill',
      barcode: '012345678905',
      categoryId: 1,
      locationId: 2,
      quantity: 5,
      minQuantity: 2,
      unitCost: 29.99,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative quantity', () => {
    const result = createItemSchema.safeParse({
      name: 'Cable',
      unit: 'pcs',
      quantity: -1,
    })
    expect(result.success).toBe(false)
  })
})

describe('createTransactionSchema', () => {
  it('validates stock in', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'IN',
      quantity: 5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantity', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'IN',
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createTransactionSchema.safeParse({
      itemId: 1,
      type: 'INVALID',
      quantity: 5,
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('validates valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })
})

describe('createCheckoutSchema', () => {
  it('validates a checkout', () => {
    const result = createCheckoutSchema.safeParse({
      itemId: 1,
      userId: 2,
      quantity: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantity', () => {
    const result = createCheckoutSchema.safeParse({
      itemId: 1,
      userId: 2,
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('createUserSchema', () => {
  it('validates a new user', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: 'securePass123',
      role: 'staff',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short password', () => {
    const result = createUserSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: '123',
      role: 'staff',
    })
    expect(result.success).toBe(false)
  })
})

describe('createCategorySchema', () => {
  it('validates a category', () => {
    const result = createCategorySchema.safeParse({ name: 'Electronics' })
    expect(result.success).toBe(true)
  })
})

describe('createLocationSchema', () => {
  it('validates a location', () => {
    const result = createLocationSchema.safeParse({ name: 'Warehouse A' })
    expect(result.success).toBe(true)
  })
})
